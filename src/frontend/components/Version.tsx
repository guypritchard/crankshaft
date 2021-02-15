import React from 'react';
import { BedrockVersion } from './types';

export interface VersionProps {
    version: BedrockVersion;
}

export const Version: React.FC<VersionProps> = (props) => {
    if (props.version == null){
        return <div>Unknown</div>;
    }

    return (
        <div className="nes-container is-rounded is-dark with-title">
            <p className="title">Version</p>
            <div>{props.version.filename}</div>
            <div>{props.version.version}</div>
            <div>{props.version.platform}</div>
            <div>{props.version.url}</div>
        </div>
    );
};
