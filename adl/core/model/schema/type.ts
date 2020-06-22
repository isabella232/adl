import { SourceFile, TypeParameterDeclarationStructure } from 'ts-morph';
import { TypeSyntax } from '../../support/codegen';

export interface TypeReference {
  /** 
   * The text for the type decaration that the consumer of this type should use
   * 
   * This may be a:
   *   built-in type, ('string')
   *   generated enum, class, interface, typealias etc ( 'Foo')
   *   inline declaration for an anonymous type (
   *     interface: '{foo: string: bar: int32}' 
   *     enum  '"http" | "https"'
   * 
   */
  readonly declaration: TypeSyntax;

  /**
   * This is a list of imports that should be applied to the file that is consuming 
   * this type declaration.
   * 
   * Classes/Enums/Interfaces/Aliases would have a reference to file that the target is in.
   * Arrays/Dictionaries would have values for the data type
   * inline declarations should have the sum of entries for all members
   */
  readonly requiredReferences: Array<TypeReference>;

  /**
   * The source file the implementation is expected to be in.
   * 
   * This may be undefined -- which means that there is nota source
   */
  readonly sourceFile?: SourceFile;

  typeParameters?: Array<TypeParameterDeclarationStructure>;
}

export interface SchemaTypeReference extends TypeReference {
}

export interface ParameterTypeReference extends TypeReference {
  name: string;
  description?: string;
  required: boolean;
  location: string;
}

export interface HeaderTypeReference extends TypeReference {
}

export interface RequestBodyTypeReference extends TypeReference {
  required: boolean;
  description?: string;
}