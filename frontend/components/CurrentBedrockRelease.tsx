import React from 'react';
import useFetch from 'react-fetch-hook';
import { BedrockVersion } from '../../interfaces/types';
import { Version } from './Version';

export const CurrentBedrockRelease: React.FC = () => {
    const { isLoading, data } = useFetch<BedrockVersion[]>('/bedrock/version');

    return isLoading ? (
        <div>Loading...</div>
    ) : (
        <section className="nes-container is-rounded is-dark">
            <h2>Current Bedrock Versions</h2>
            {data.map((v) => (
                <Version key={v.version} version={v} />
            ))}
        </section>
    );
};
