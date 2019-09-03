import { createActionCreator, createReducer } from 'deox';
import { Dispatch } from 'redux';
import { actions as listActions } from '../List/action';
import { actions as cardActions } from '../Card/action';
import { actions as kanbanActions } from '../action';
import { DBWorker } from '../../../workers/DBWorker';
import shortid from 'shortid';

const db = new DBWorker('kanbanDB');
type ListId = string;
type SessionId = string;

export interface AggInfo {
    lastUpdatedTime: number;
    spentTime: number;
    appSpentTime: { [app: string]: number };
    keywordWeights: { [key: string]: number };
}

export interface KanbanBoard {
    _id: string;
    name: string;
    spentHours: number;
    description: string;
    lists: ListId[]; // lists id in order
    focusedList: string;
    relatedSessions: SessionId[];
    aggInfo?: AggInfo;
}

const defaultBoard: KanbanBoard = {
    _id: '',
    lists: [],
    name: '',
    focusedList: '',
    description: '',

    relatedSessions: [],
    spentHours: 0
};

export type KanbanBoardState = { [_id: string]: KanbanBoard };

const addBoard = createActionCreator(
    '[Board]ADD',
    resolve => (
        _id: string,
        name: string,
        description: string,
        lists: string[],
        focusedList: string
    ) => resolve({ _id, name, description, lists, focusedList })
);

const setBoardMap = createActionCreator(
    '[Board]SET_BOARD_MAP',
    resolve => (boards: KanbanBoardState) => resolve(boards)
);

const moveList = createActionCreator(
    '[Board]MOVE_LIST',
    resolve => (_id: string, fromIndex: number, toIndex: number) =>
        resolve({ _id, fromIndex, toIndex })
);

const renameBoard = createActionCreator('[Board]RENAME', resolve => (_id, name) =>
    resolve({ _id, name })
);

const addList = createActionCreator('[Board]ADD_LIST', resolve => (_id, listId) =>
    resolve({ _id, cardId: listId })
);

const deleteBoard = createActionCreator('[Board]DEL_BOARD', resolve => _id => resolve({ _id }));

const deleteList = createActionCreator('[Board]DEL_LIST', resolve => (_id, listId) =>
    resolve({ _id, listId })
);

const onTimerFinished = createActionCreator(
    '[Board]ON_TIMER_FINISHED',
    resolve => (_id: string, sessionId: string, spentTime: number) =>
        resolve({ _id, sessionId, spentTime })
);

const editBoard = createActionCreator(
    '[Board]EDIT',
    resolve => (_id: string, name: string, description: string) =>
        resolve({ _id, name, description })
);

const updateAggInfo = createActionCreator(
    '[Board]UPDATE_AGG_INFO',
    resolve => (_id: string, aggInfo: AggInfo) => resolve({ _id, aggInfo })
);

export const boardReducer = createReducer<KanbanBoardState, any>({}, handle => [
    handle(addBoard, (state, { payload: { _id, name, description, lists, focusedList } }) => ({
        ...state,
        [_id]: {
            ...defaultBoard,
            _id,
            description,
            name,
            lists,
            focusedList
        }
    })),

    handle(setBoardMap, (state, { payload }) => payload),
    handle(moveList, (state, { payload: { _id, fromIndex, toIndex } }) => {
        const newState = { ...state };
        const lists = newState[_id].lists.concat();
        const [rm] = lists.splice(fromIndex, 1);
        lists.splice(toIndex, 0, rm);
        newState[_id].lists = lists;
        return newState;
    }),

    handle(renameBoard, (state, { payload: { _id, name } }) => {
        return {
            ...state,
            [_id]: {
                ...state[_id],
                name
            }
        };
    }),

    handle(addList, (state, { payload: { _id, cardId } }) => ({
        ...state,
        [_id]: {
            ...state[_id],
            lists: [...state[_id].lists, cardId]
        }
    })),

    handle(deleteBoard, (state, { payload: { _id } }) => {
        const { [_id]: del, ...rest } = state;
        return rest;
    }),

    handle(deleteList, (state, { payload: { _id, listId } }) => {
        const newState = { ...state };
        newState[_id].lists = newState[_id].lists.filter(v => v !== listId);
        return newState;
    }),

    handle(onTimerFinished, (state, { payload: { _id, sessionId, spentTime } }) => {
        return {
            ...state,
            [_id]: {
                ...state[_id],
                relatedSessions: state[_id].relatedSessions.concat([sessionId]),
                spentHours: state[_id].spentHours + spentTime
            }
        };
    }),

    handle(editBoard, (state, { payload: { _id, name, description } }) => ({
        ...state,
        [_id]: {
            ...state[_id],
            name,
            description
        }
    }))
]);

export const actions = {
    fetchBoards: () => async (dispatch: Dispatch) => {
        const boards: KanbanBoard[] = await db.find({}, {});
        const boardMap: KanbanBoardState = {};
        for (const board of boards) {
            boardMap[board._id] = board;
        }

        await listActions.fetchLists()(dispatch);
        await cardActions.fetchCards()(dispatch);
        dispatch(setBoardMap(boardMap));
    },
    moveList: (_id: string, fromIndex: number, toIndex: number) => async (dispatch: Dispatch) => {
        dispatch(moveList(_id, fromIndex, toIndex));
        const board: KanbanBoard = await db.findOne({ _id });
        const lists = board.lists;
        const [del] = lists.splice(fromIndex, 1);
        lists.splice(toIndex, 0, del);
        await db.update({ _id }, { $set: { lists } });
    },
    renameBoard: (_id: string, name: string) => async (dispatch: Dispatch) => {
        dispatch(renameBoard(_id, name));
        await db.update({ _id }, { $set: { name } });
    },
    addList: (_id: string, listTitle: string) => async (dispatch: Dispatch) => {
        const listId = shortid.generate();
        dispatch(addList(_id, listId));
        await listActions.addList(listId, listTitle)(dispatch);
        await db.update({ _id }, { $push: { lists: listId } });
    },
    addListById: (_id: string, listId: string) => async (dispatch: Dispatch) => {
        dispatch(addList(_id, listId));
        await db.update({ _id }, { $push: { lists: listId } });
    },
    deleteBoard: (_id: string) => async (dispatch: Dispatch) => {
        dispatch(kanbanActions.setChosenBoardId(undefined));
        dispatch(deleteBoard(_id));
        await db.remove({ _id });
    },
    deleteList: (_id: string, listId: string) => async (dispatch: Dispatch) => {
        dispatch(deleteList(_id, listId));
        await listActions.deleteList(listId)(dispatch);
        await db.update({ _id }, { $pull: { lists: listId } });
    },

    addBoard: (_id: string, name: string, description: string = '') => async (
        dispatch: Dispatch
    ) => {
        const lists = [];
        for (const name of ['TODO', 'In Progress', 'Done']) {
            const listId = shortid.generate();
            await listActions.addList(listId, name)(dispatch);
            lists.push(listId);
        }
        dispatch(addBoard(_id, name, description, lists, lists[1]));

        await db.insert({
            ...defaultBoard,
            _id,
            description,
            name,
            lists,
            focusedList: lists[1]
        } as KanbanBoard);
    },

    moveCard: (fromListId: string, toListId: string, fromIndex: number, toIndex: number) => async (
        dispatch: Dispatch
    ) => {
        await listActions.moveCard(fromListId, toListId, fromIndex, toIndex)(dispatch);
    },

    onTimerFinished: (
        _id: string,
        sessionId: string,
        timeSpent: number,
        cardIds: string[]
    ) => async (dispatch: Dispatch) => {
        dispatch(onTimerFinished(_id, sessionId, timeSpent));
        await db.update(
            { _id },
            { $push: { relatedSessions: sessionId }, $inc: { spentHours: timeSpent } }
        );
        for (const cardId of cardIds) {
            await cardActions.onTimerFinished(cardId, sessionId, timeSpent)(dispatch);
        }
    },

    editBoard: (_id: string, name: string, description: string) => async (dispatch: Dispatch) => {
        dispatch(editBoard(_id, name, description));
        await db.update({ _id }, { $set: { name, description } });
    }
};

export type BoardActionTypes = { [key in keyof typeof actions]: typeof actions[key] };
