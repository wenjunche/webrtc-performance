import { createStore } from 'redux';

export type PerformanceConfig = {
    message: {
        size: number
    }
}

type ACTION_TYPE = 'SET_MESSAGE_SIZE'

export type ConfigAction = {
    type: ACTION_TYPE;
    data: any;
}


const initialState: PerformanceConfig = {
    message: {
        size: 1024
    }
};

function rootReducer(state: PerformanceConfig, action: ConfigAction): PerformanceConfig {
    if (action.type === 'SET_MESSAGE_SIZE') {
        return Object.assign({}, state, 
            { message: action.data.message } );
    } 
    else {
        console.log('rootReducer valid type ', action.type);
    }
    return state;
}

export const store = createStore(rootReducer, initialState);
