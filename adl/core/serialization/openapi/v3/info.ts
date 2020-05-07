import { v3 } from '@azure-tools/openapi';
import { use } from '@azure-tools/sourcemap';
import { Contact, ContactRole } from '../../../model/contact';
import { License } from '../../../model/license';
import { Metadata } from '../../../model/metadata';
import { Reference } from '../../../model/Reference';
import { is } from '../../../support/visitor';
import { addExtensionsToAttic } from '../common';
import { Context } from './serializer';

async function *processContact(contact: v3.Contact, $: Context) {
  const result = new Contact(ContactRole.Author, {
    name: contact.name,
    email: contact.email,
    url: contact.url,
  });

  // add remaining extensions to attic. 
  await addExtensionsToAttic(result, contact);

  yield result;
}

async function *processLicense(license: v3.License, $: Context) {
  const result = new License(license.name, {
    url: license.url
  });
  // add remaining extensions to attic. 
  await addExtensionsToAttic(result, license);

  yield result;
}

export async function *processInfo(info: v3.Info, $: Context): AsyncGenerator<Metadata> {

  // create the metadata 
  const metadata = new Metadata(info.title, {
    description: info.description,
    termsOfService: info.termsOfService
  });

  // add the author contact
  if (is(info.contact)) {
    for await (const c of $.process(processContact, info.contact)) {
      metadata.contacts.push(c)  ;
    }
    //metadata.contacts.push(await $.process2(processContact, info.contact));
  }

  // add license
  if (is(info.license)) {
    for await (const l of $.process(processLicense, info.license) ) {
      metadata.licenses.push(l);
    }
    //metadata.licenses.push(await $.process(processLicense, info.license));
  }

  // add remaining extensions to attic. 
  await addExtensionsToAttic(metadata, info);

  // we handled version much earler.
  use(info.version);

  yield metadata;
}


export async function *processExternalDocs(externalDocs: v3.ExternalDocumentation|undefined, $: Context): AsyncGenerator<Reference> {
  if( externalDocs ) {
  // external docs are just a kind of reference. 
    const reference = new Reference('external-documentation', {
      location: externalDocs.url,
      description: externalDocs.description,
    });
    await addExtensionsToAttic(reference, externalDocs);

    yield reference;
  }
}


export async function *processTag(tag: v3.Tag, $: Context): AsyncGenerator<Reference> {
  const reference = new Reference(tag.name, {
    summary: tag.description,
    location: tag.externalDocs ? tag.externalDocs.url : undefined,
    description: tag.externalDocs ? tag.externalDocs.description : undefined,
  });
  use(tag.externalDocs);

  await addExtensionsToAttic(reference, tag);

  yield reference;
}