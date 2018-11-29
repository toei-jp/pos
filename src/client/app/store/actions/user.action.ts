import { factory } from '@cinerino/api-javascript-client';
import { Action } from '@ngrx/store';

/**
 * Action types
 */
export enum ActionTypes {
    Delete = '[User] User',
    UpdateAll = '[User] Update All',
    GetTheaters = '[User] Get Theaters',
    GetTheatersSuccess = '[User] Get Theaters Success',
    GetTheatersFail = '[User] Get Theaters Fail'
}

/**
 * Delete
 */
export class Delete implements Action {
    public readonly type = ActionTypes.Delete;
    constructor(public payload: {}) { }
}

/**
 * Update
 */
export class UpdateAll implements Action {
    public readonly type = ActionTypes.UpdateAll;
    constructor(public payload: {
        movieTheater: factory.organization.movieTheater.IOrganization;
        pos: any;
        customerContact: factory.transaction.placeOrder.ICustomerContact;
        printer: { ipAddress: string; };
    }) { }
}

/**
 * GetTheaters
 */
export class GetTheaters implements Action {
    public readonly type = ActionTypes.GetTheaters;
    constructor(public payload: { params: factory.organization.movieTheater.ISearchConditions }) { }
}

/**
 * GetTheatersSuccess
 */
export class GetTheatersSuccess implements Action {
    public readonly type = ActionTypes.GetTheatersSuccess;
    constructor(public payload: { movieTheaters: factory.organization.movieTheater.IOrganization[] }) { }
}

/**
 * GetTheatersFail
 */
export class GetTheatersFail implements Action {
    public readonly type = ActionTypes.GetTheatersFail;
    constructor(public payload: { error: Error }) { }
}

/**
 * Actions
 */
export type Actions =
    | Delete
    | UpdateAll
    | GetTheaters
    | GetTheatersSuccess
    | GetTheatersFail;
