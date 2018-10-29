import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { map, mergeMap } from 'rxjs/operators';
import { CinerinoService } from '../../services/cinerino.service';
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
                const searchMovieTheatersResult = await this.cinerino.organization.searchMovieTheaters(payload.params);
                const movieTheaters = searchMovieTheatersResult.data;
                return new user.GetTheatersSuccess({ movieTheaters });
            } catch (error) {
                return new user.GetTheatersFail({ error: error });
            }
        })
    );
}
