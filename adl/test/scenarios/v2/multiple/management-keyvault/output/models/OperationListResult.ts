import { Operation } from './Operation';
/**
 * @description Result of the request to list Storage operations. It contains a list of operations and a URL link to get the next set of results.
 */
export interface OperationListResult {
    /**
     * @description List of Storage operations supported by the Storage resource provider.
     */
    value: Array<Operation>;
    /**
     * @description The URL to get the next set of operations.
     */
    nextLink: string;
}