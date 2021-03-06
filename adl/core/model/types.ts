import { anonymous } from '@azure-tools/sourcemap';
import { Directory } from 'ts-morph';

export type Identity = string | anonymous;

export type URL = string;

export interface Folders {
  anonymous: Directory;
  alias: Directory;
  model: Directory;
  enum: Directory;
  group: Directory;
  resource: Directory;
}

export interface FileInfo {
  filename: string;
}

export type Version = string;
