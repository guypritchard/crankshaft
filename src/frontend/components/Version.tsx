import React from 'react';
import { BedrockVersion } from '../../../interfaces/types';

export interface VersionProps {
    version: BedrockVersion;
}

export const Version: React.FC<VersionProps> = (props) => {
    if (props.version == null) {
        return <div>Unknown</div>;
    }

    return (
        <div className="nes-badge -right">
            <span className="is-primary">{props.version.build}</span>
        </div>
    );
};
