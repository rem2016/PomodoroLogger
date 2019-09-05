import { createActionCreator, createReducer } from 'deox';
import { Dispatch } from 'redux';
import { actions as listActions } from '../List/action';
import { DBWorker } from '../../../workers/DBWorker';
const db = new DBWorker('cardsDB');

type History = { listId: string; time: number }[];
export interface Card {
    _id: string;
    content: string;
    title: string;
    sessionIds: string[];
    spentTimeInHour: {
        estimated: number;
        actual: number;
    };
}

export type CardsState = { [_id: string]: Card };

const addSession = createActionCreator(
    '[Card]ADD_SESSION',
    resolve => (_id: string, sessionId: string, spentTime: number) =>
        resolve({ _id, sessionId, spentTime })
);

const addCard = createActionCreator(
    '[Card]ADD',
    resolve => (_id: string, title?: string, content?: string) => resolve({ _id, title, content })
);

const renameCard = createActionCreator('[Card]RENAME', resolve => (_id: string, title: string) =>
    resolve({ _id, title })
);

const setContent = createActionCreator(
    '[Card]SET_CONTENT',
    resolve => (_id: string, content: string) => resolve({ _id, content })
);

const setEstimatedTime = createActionCreator(
    '[Card]SET_ESTIMATED_TIME',
    resolve => (_id: string, estimatedTime: number) => resolve({ _id, estimatedTime })
);

const setActualTime = createActionCreator(
    '[Card]SET_ACTUAL_TIME',
    resolve => (_id: string, actualTime: number) => resolve({ _id, actualTime })
);

const addActualTime = createActionCreator(
    '[Card]ADD_ACTUAL_TIME',
    resolve => (_id: string, plus: number) => resolve({ _id, plus })
);

const deleteCard = createActionCreator('[Card]DELETE_CARD', resolve => (_id: string) =>
    resolve({ _id })
);

const setCards = createActionCreator('[Card]SET_CARDS', resolve => (cards: CardsState) =>
    resolve(cards)
);

export const actions = {
    fetchCards: () => async (dispatch: Dispatch) => {
        const cards: Card[] = await db.find({}, {});
        const cardMap: CardsState = {};
        for (const card of cards) {
            cardMap[card._id] = card;
        }

        dispatch(setCards(cardMap));
    },
    renameCard: (_id: string, title: string) => async (dispatch: Dispatch) => {
        dispatch(renameCard(_id, title));
        await db.update({ _id }, { $set: { title } });
    },
    setContent: (_id: string, content: string) => async (dispatch: Dispatch) => {
        dispatch(setContent(_id, content));
        await db.update({ _id }, { $set: { content } });
    },
    setEstimatedTime: (_id: string, estimatedTime: number) => async (dispatch: Dispatch) => {
        dispatch(setEstimatedTime(_id, estimatedTime));
        await db.update({ _id }, { $set: { 'spentTimeInHour.estimated': estimatedTime } });
    },
    setActualTime: (_id: string, actualTime: number) => async (dispatch: Dispatch) => {
        dispatch(setActualTime(_id, actualTime));
        await db.update({ _id }, { $set: { 'spentTimeInHour.actual': actualTime } });
    },
    addActualTime: (_id: string, plus: number) => async (dispatch: Dispatch) => {
        dispatch(addActualTime(_id, plus));
        await db.update({ _id }, { $inc: { 'spentTimeInHour.actual': plus } });
    },
    deleteCard: (_id: string, listId: string) => async (dispatch: Dispatch) => {
        await listActions.deleteCard(listId, _id)(dispatch);
        dispatch(deleteCard(_id));
        await db.remove({ _id });
    },
    onTimerFinished: (_id: string, sessionId: string, spentTimeInHour: number) => async (
        dispatch: Dispatch
    ) => {
        dispatch(addSession(_id, sessionId, spentTimeInHour));
        await db.update(
            { _id },
            {
                $push: { sessionIds: sessionId },
                $inc: { 'spentTimeInHour.actual': spentTimeInHour }
            }
        );
    },
    addCard: (_id: string, listId: string, title: string, content: string = '') => async (
        dispatch: Dispatch
    ) => {
        dispatch(addCard(_id, title, content));
        await listActions.addCardById(listId, _id)(dispatch);
        await db.insert({
            _id,
            title,
            content,
            sessionIds: [],
            spentTimeInHour: {
                estimated: 0,
                actual: 0
            }
        });
    }
};

export const cardReducer = createReducer<CardsState, any>({}, handle => [
    handle(addCard, (state, { payload: { _id, title = '', content = '' } }) => {
        return {
            ...state,
            [_id]: {
                _id,
                title,
                content,
                sessionIds: [],
                spentTimeInHour: {
                    actual: 0,
                    estimated: 0
                }
            }
        };
    }),

    handle(renameCard, (state, { payload: { _id, title } }) => {
        return {
            ...state,
            [_id]: {
                ...state[_id],
                title
            }
        };
    }),

    handle(setContent, (state, { payload: { _id, content } }) => {
        return {
            ...state,
            [_id]: {
                ...state[_id],
                content
            }
        };
    }),

    handle(setEstimatedTime, (state, { payload: { _id, estimatedTime } }) => {
        return {
            ...state,
            [_id]: {
                ...state[_id],
                spentTimeInHour: {
                    actual: state[_id].spentTimeInHour.actual,
                    estimated: estimatedTime
                }
            }
        };
    }),

    handle(setActualTime, (state, { payload: { _id, actualTime } }) => {
        return {
            ...state,
            [_id]: {
                ...state[_id],
                spentTimeInHour: {
                    actual: actualTime,
                    estimated: state[_id].spentTimeInHour.estimated
                }
            }
        };
    }),

    handle(deleteCard, (state, { payload: { _id } }) => {
        const { [_id]: deleted, ...rest } = state;
        return rest;
    }),

    handle(setCards, (state, { payload }) => payload),
    handle(addActualTime, (state, { payload: { _id, plus } }) => {
        return {
            ...state,
            [_id]: {
                ...state[_id],
                spentTimeInHour: {
                    ...state[_id].spentTimeInHour,
                    actual: state[_id].spentTimeInHour.actual + plus
                }
            }
        };
    }),

    handle(addSession, (state, { payload: { _id, sessionId, spentTime } }) => {
        const card = state[_id];
        return {
            ...state,
            [_id]: {
                ...card,
                sessionIds: [...card.sessionIds, sessionId],
                spentTimeInHour: {
                    actual: card.spentTimeInHour.actual + spentTime,
                    estimated: card.spentTimeInHour.estimated
                }
            }
        };
    })
]);

export type CardActionTypes = { [key in keyof typeof actions]: typeof actions[key] };
