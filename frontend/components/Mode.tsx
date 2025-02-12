import React from 'react';
import { BedrockMode } from '../../interfaces/types';

export interface ServerModeProps {
    mode: string;
}

export const Mode: React.FC<ServerModeProps> = (props) => {
    if (props.mode == null) {
        return <div>Unknown</div>;
    }

    return (
        <div className="nes-badge crankshaft-badge">
            <span className={props.mode === BedrockMode.survival ? 'is-success' : 'is-error'}>
                {props.mode.toString()}
            </span>
        </div>
    );
};
