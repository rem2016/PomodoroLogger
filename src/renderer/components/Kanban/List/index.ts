import { connect } from 'react-redux';
import { List, InputProps } from './List';
import { RootState } from '../../../reducers';
import { ListActionTypes, actions } from './action';
import { genMapDispatchToProp } from '../../../utils';

const mapStateToProps = (state: RootState, props: InputProps) => {
    return { ...state.kanban.lists[props.listId] };
};

const mapDispatchToProps = genMapDispatchToProp<ListActionTypes>(actions);
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(List);
