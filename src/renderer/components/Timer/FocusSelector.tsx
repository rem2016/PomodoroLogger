import React, { FunctionComponent } from 'react';
import { Select } from 'antd';
import { KanbanState } from '../Kanban/reducer';
import { actions as timerActions } from './action';
import { RootState } from '../../reducers';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

const { Option } = Select;

interface Props {
    width?: number;
    chosenId: string | undefined;
    kanban: KanbanState;
    setId: (id?: string) => any;
}

const mFocusSelector: FunctionComponent<Props> = (props: Props) => {
    const onChange = (value?: string) => {
        props.setId(value);
    };

    const options = Object.values(props.kanban.boards).map(v => (
        <Option key={v._id} value={v._id} className="focus-option">
            {v.name}
        </Option>
    ));

    let style: any = {
        minWidth: 100,
        width: '100%'
    };

    if (props.width) {
        style = { width: props.width };
    }

    return (
        <Select
            value={props.chosenId}
            style={style}
            placeholder="Choose Your Focus"
            onChange={onChange}
            id="focus-selector"
        >
            {options}
            <Option
                key="undefined"
                value={undefined}
                style={{ color: '#bfbfbf' }}
                className="focus-option"
            >
                No Focusing Project
            </Option>
        </Select>
    );
};

export const FocusSelector = connect(
    (state: RootState) => ({
        chosenId: state.timer.boardId,
        kanban: state.kanban
    }),
    (dispatch: Dispatch) => ({
        setId: (id?: string) => dispatch(timerActions.setBoardId(id))
    })
)(mFocusSelector);
