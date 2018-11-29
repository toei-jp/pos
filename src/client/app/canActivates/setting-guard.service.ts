/**
 * SettingGuardService
 */
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as reducers from '../store/reducers';

@Injectable({
    providedIn: 'root'
})
export class SettingGuardService implements CanActivate {
    public user: Observable<reducers.IUserState>;
    constructor(
        private router: Router,
        private store: Store<reducers.IState>
    ) { }

    /**
     * 認証
     * @method canActivate
     * @returns {Promise<boolean>}
     */
    public async canActivate(): Promise<boolean> {
        try {
            this.user = this.store.pipe(select(reducers.getUser));
            const user = await this.getUser();
            if (user.movieTheater === undefined) {
                throw new Error('user.movieTheater is undefined');
            }

            return true;
        } catch (error) {
            console.log('canActivate', error);
            this.router.navigate(['/setting']);

            return false;
        }
    }

    private async getUser() {
        return new Promise<reducers.IUserState>((resolve) => {
            this.user.subscribe((user) => {
                resolve(user);
            }).unsubscribe();
        });
    }
}
