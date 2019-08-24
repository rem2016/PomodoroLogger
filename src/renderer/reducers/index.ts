import { combineReducers } from 'redux';

import { reducer as timerReducer, TimerState } from '../components/Timer/action';
import { todoReducer, TodoState } from '../components/TODO/action';
import { projectReducer, ProjectState } from '../components/Project/action';
import { reducer as historyReducer, HistoryState } from '../components/History/action';
import { reducer as kanbanReducer, KanbanState } from '../components/Kanban/reducer';

export interface RootState {
    timer: TimerState;
    todo: TodoState;
    project: ProjectState;
    history: HistoryState;
    kanban: KanbanState;
}

export const rootReducer = combineReducers<RootState | undefined>({
    timer: timerReducer,
    todo: todoReducer,
    project: projectReducer,
    history: historyReducer,
    kanban: kanbanReducer
});
