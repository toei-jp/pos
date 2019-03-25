import { factory } from '@cinerino/api-javascript-client';
import { IState } from '.';
import { Actions, ActionTypes } from '../actions/user.action';

export interface IUserState {
    sellers: factory.seller.IOrganization<factory.seller.IAttributes<factory.organizationType>>[];
    seller?: factory.seller.IOrganization<factory.seller.IAttributes<factory.organizationType>>;
    pos?: factory.seller.IPOS;
    customerContact?: factory.transaction.placeOrder.ICustomerContact;
    printer?: { ipAddress: string; };
}

/**
 * Reducer
 * @param state
 * @param action
 */
export function reducer(state: IState, action: Actions): IState {
    switch (action.type) {
        case ActionTypes.Delete: {
            return { ...state, loading: false };
        }
        case ActionTypes.UpdateAll: {
            const customerContact = action.payload.customerContact;
            const seller = action.payload.seller;
            const pos = action.payload.pos;
            const printer = action.payload.printer;
            state.user.customerContact = customerContact;
            state.user.seller = seller;
            state.user.pos = pos;
            state.user.printer = printer;

            return { ...state, loading: false };
        }
        case ActionTypes.GetTheaters: {
            return { ...state, loading: true };
        }
        case ActionTypes.GetTheatersSuccess: {
            const sellers = action.payload.sellers;
            return {
                ...state, loading: false, error: null, user: {
                    ...state.user, sellers
                }
            };
        }
        case ActionTypes.GetTheatersFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        default: {
            return state;
        }
    }
}
