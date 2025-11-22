import React from 'react';
import { MinecraftEdition, ServerVersion } from '../../interfaces/types';

export interface VersionProps {
    version: ServerVersion | null;
    edition?: MinecraftEdition;
}

export const Version: React.FC<VersionProps> = (props) => {
    if (props.version == null) {
        return <div>Unknown</div>;
    }

    const label = props.version.build ?? props.version.version;

    return (
        <div className="nes-badge -right crankshaft-badge">
            <span className="is-primary">{label}</span>
        </div>
    );
};
