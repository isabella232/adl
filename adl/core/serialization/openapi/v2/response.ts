import { items } from '@azure-tools/linq';
import { isReference, v2 } from '@azure-tools/openapi';
import { anonymous, nameOf, refTo } from '@azure-tools/sourcemap';
import { StructureKind, ts, TypeParameterDeclarationStructure } from 'ts-morph';
import { getMediaTypeUnion, getResponseType } from '../../../model/http/operation';
import { createTypeAlias } from '../../../model/schema/alias';
import { HeaderTypeReference, ResponseTypeReference } from '../../../model/schema/type';
import { assert } from '../../../support/assert';
import { TypeSyntax } from '../../../support/codegen';
import { processHeader } from './header';
import { processSchema } from './schema';
import { Context } from './serializer';

export type ResponseOptions = { isAnonymous: false } | ({ isAnonymous: true } & AnonymousResponseOptions);
export type AnonymousResponseOptions = { operation: v2.Operation; code: string }

export async function processResponse(response: v2.Response | v2.ResponseReference, $: Context, options: ResponseOptions = { isAnonymous: false }): Promise<ResponseTypeReference> {
  const here = $.normalizeReference(refTo(response)).$ref;
  const responseRef = $.visitor.references.response.get(here);
  if (responseRef) {
    return responseRef;
  }

  const impl = async () => {
    if (isReference(response)) {
      let responseRef = $.visitor.references.response.get($.normalizeReference(response.$ref).$ref);
      if (!responseRef) {
        const resolvedReference = await $.resolveReference(response.$ref);
        responseRef = await processResponse(resolvedReference.node, resolvedReference.context);
      }

      assert(options.isAnonymous);
      return specializeResponse(responseRef, $, options);
    }

    const name  = options?.isAnonymous ? anonymous('response') : nameOf(response);
    const responseRef = await getResponseTypeReference(response, $, options);
    return createTypeAlias($.api, name, responseRef, { summary: options?.isAnonymous ? undefined : response.description });
  };

  const result = await impl();
  $.visitor.references.response.set(here, result);
  return result;
}

async function getResponseTypeReference(response: v2.Response, $: Context, options: ResponseOptions): Promise<ResponseTypeReference> {
  const schema = response.schema ? (await processSchema(response.schema, $, { isAnonymous: true })) : undefined;
  const headers = await processResponseHeaders(response, $);

  const requiredReferences = [...headers];
  if (schema) {
    requiredReferences.push(schema);
  }

  let code: string | ts.TypeNode;
  let isException: boolean | ts.TypeNode;
  let typeParameters: Array<TypeParameterDeclarationStructure> | undefined;
  let mediaType: ts.TypeNode | undefined;

  if (options.isAnonymous) {
    [code, isException, mediaType] = getResponseTypeArguments($, options);
  } else {
    code = ts.createTypeReferenceNode('Code', undefined);
    isException = ts.createTypeReferenceNode('IsException', undefined);
    mediaType = ts.createTypeReferenceNode('MediaType', undefined);
    typeParameters = [
      { kind: StructureKind.TypeParameter, name: 'Code', default: 'undefined' },
      { kind: StructureKind.TypeParameter, name: 'IsException', default: 'false' },
      { kind: StructureKind.TypeParameter, name: 'MediaType', default: 'undefined' }
    ];
  }

  const type = getResponseType(code, isException, mediaType, schema, headers);
  return {
    declaration: new TypeSyntax(type),
    requiredReferences,
    typeParameters,
    description: options?.isAnonymous ? response.description : undefined,
    code: options?.isAnonymous ? options.code : undefined,
  };
}

function getResponseTypeArguments($: Context, options: AnonymousResponseOptions): [string, boolean, ts.TypeNode | undefined] {
  const operation = options.operation;
  const produces = operation.produces ?? $.sourceModel.produces;
  const code = options.code;
  const isException = code == 'default' || code.startsWith('4') || code.startsWith('5');
  const mediaType = getMediaTypeUnion(produces);

  return [code, isException, mediaType];
}

async function processResponseHeaders(response: v2.Response, $: Context) {
  const headers = new Array<HeaderTypeReference>();
  for (const [key, value] of items(response.headers)) {
    const h = await processHeader(value, $, { isAnonymous: true, wireName: key });
    headers.push(h);
  }
  return headers;
}

function specializeResponse(responseRef: ResponseTypeReference, $: Context, options: AnonymousResponseOptions): ResponseTypeReference {
  const [code, isException, mediaType] = getResponseTypeArguments($, options);

  const args: Array<ts.TypeNode> = [
    ts.createLiteralTypeNode(ts.createStringLiteral(code)),
    ts.createLiteralTypeNode(ts.createLiteral(isException)),
  ];

  if (mediaType) {
    args.push(mediaType);
  }

  const type = <ts.TypeReferenceNode>responseRef.declaration.node;
  const specializedType = ts.createTypeReferenceNode(type.typeName, args);
  return {
    ...responseRef,
    typeParameters: undefined,
    sourceFile: undefined,
    requiredReferences: [responseRef],
    declaration: new TypeSyntax(specializedType),
  };
}
