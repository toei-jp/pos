import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { map, mergeMap } from 'rxjs/operators';
import { CinerinoService } from '../../services';
import * as user from '../actions/user.action';

/**
 * User Effects
 */
@Injectable()
export class UserEffects {

    constructor(
        private actions: Actions,
        private cinerino: CinerinoService
    ) { }

    /**
     * GetTheaters
     */
    @Effect()
    public getTheaters = this.actions.pipe(
        ofType<user.GetTheaters>(user.ActionTypes.GetTheaters),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                const searchResult = await this.cinerino.seller.search(payload.params);
                const sellers = searchResult.data;
                return new user.GetTheatersSuccess({ sellers });
            } catch (error) {
                return new user.GetTheatersFail({ error: error });
            }
        })
    );
}
