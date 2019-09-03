import React, { FC, useState, useRef, useEffect, ChangeEvent } from 'react';
import { actions } from './action';
import { connect } from 'react-redux';
import { RootState } from '../../reducers';
import { Dispatch } from 'redux';
import styled from 'styled-components';
import Search from 'antd/es/input/Search';

const Bar = styled.div`
    position: fixed;
    top: 60px;
    right: 30px;
    z-index: 10000;

    input {
        box-shadow: 2px 2px 4px 4px rgba(40, 40, 40, 0.2);
    }
`;

interface Props {
    reg?: string;
    setReg: (reg?: string) => void;
}

const _SearchBar: FC<Props> = (props: Props) => {
    const [visible, setVisible] = useState(false);
    const ref = useRef<Search>();
    useEffect(() => {
        window.addEventListener('keydown', event => {
            if (
                event.ctrlKey &&
                (event.key === 'f' || event.which === 70 || event.code === 'KeyF')
            ) {
                // Ctrl + F: Search
                setVisible(true);
                if (ref.current) {
                    ref.current.focus();
                }
            } else if (event.key === 'Escape' || event.which === 27 || event.code === 'Escape') {
                setVisible(false);
            }
        });
    }, []);

    const onSearch = () => {
        setVisible(false);
    };

    const onChange = (event: any) => {
        props.setReg(event.target.value);
    };

    return (
        <Bar style={{ display: visible ? undefined : 'none' }}>
            <Search
                // @ts-ignore
                ref={ref}
                placeholder="input search text"
                onSearch={onSearch}
                onChange={onChange}
                value={props.reg}
            />
        </Bar>
    );
};

export const SearchBar = connect(
    (state: RootState) => ({
        reg: state.kanban.kanban.searchReg
    }),
    (dispatch: Dispatch) => ({
        setReg: (reg?: string) => dispatch(actions.setSearchReg(reg))
    })
)(_SearchBar);
