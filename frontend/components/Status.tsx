import React from 'react';
import { ServerStatus } from '../../interfaces/types';

export interface StatusProps {
    status: ServerStatus;
}

export const Status: React.FC<StatusProps> = (props) => {
    if (props.status == null) {
        return <div>Unknown</div>;
    }

    return (
        <div className="nes-badge -right crankshaft-badge">
            <span className={props.status === ServerStatus.Running ? 'is-success' : 'is-error'}>
                {props.status === ServerStatus.Running ? 'Running' : 'Stopped'}
            </span>
        </div>
    );
};
