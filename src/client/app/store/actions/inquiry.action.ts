import { Action } from '@ngrx/store';
import { factory } from '@toei-jp/cinerino-api-javascript-client';

/**
 * Action types
 */
export enum ActionTypes {
    Delete = '[Inquiry] Inquiry',
    Inquiry = '[Inquiry] Inquiry',
    InquirySuccess = '[Inquiry] Inquiry Success',
    InquiryFail = '[Inquiry] Inquiry Fail'
}

/**
 * Delete
 */
export class Delete implements Action {
    public readonly type = ActionTypes.Delete;
    constructor(public payload?: {}) { }
}

/**
 * Inquiry
 */
export class Inquiry implements Action {
    public readonly type = ActionTypes.Inquiry;
    constructor(public payload: {
        confirmationNumber: number;
        customer: {
            email?: string;
            telephone?: string;
        };
    }) { }
}

/**
 * InquirySuccess
 */
export class InquirySuccess implements Action {
    public readonly type = ActionTypes.InquirySuccess;
    constructor(public payload: { order: factory.order.IOrder }) { }
}

/**
 * InquiryFail
 */
export class InquiryFail implements Action {
    public readonly type = ActionTypes.InquiryFail;
    constructor(public payload: { error: Error }) { }
}

/**
 * Actions
 */
export type Actions =
    | Delete
    | Inquiry
    | InquirySuccess
    | InquiryFail;
