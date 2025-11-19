import React from 'react';

export interface ServerPortProps {
    port: number;
}

export const Port: React.FC<ServerPortProps> = (props) => {
    if (props.port === 0) {
        return <div>Unknown</div>;
    }

    return (
        <div className="nes-badge crankshaft-badge">
            <span className="is-error">{props.port}</span>
        </div>
    );
};
