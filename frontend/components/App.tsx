import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Server } from './Server';
import '../styles.scss';
import { Header } from './Header';
import { BedrockVersion, ServerState, ServerStatus } from '../../interfaces/types';
import useFetch from 'react-fetch-hook';
import { CreateServer } from './CreateServer';

interface ExistingServer {
    id: number;
    state: ServerState;
}

export const App: React.FC = () => {
    const [refreshIndex, setRefreshIndex] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const [activeServerId, setActiveServerId] = useState<number | null>(null);
    const [isCreateVisible, setIsCreateVisible] = useState(false);
    const [pendingActiveServerId, setPendingActiveServerId] = useState<number | null>(null);

    const version = useFetch<BedrockVersion[]>('/bedrock/versions');
    const servers = useFetch<ExistingServer[]>('/servers', { depends: [refreshIndex + 1] });
    const triggerServerRefresh = useCallback(() => {
        setRefreshIndex((current) => current + 1);
    }, []);

    const createServer = async (serverId: number, port?: number): Promise<void> => {
        setIsCreating(true);
        try {
            const response = await fetch(`/servers/${serverId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ port }),
            });

            if (response.ok === false) {
                const message = await response.text();
                throw new Error(message || `Unable to create server (${response.status})`);
            }

            setPendingActiveServerId(serverId);
            setRefreshIndex((current) => current + 1);
            setIsCreateVisible(false);
        } finally {
            setIsCreating(false);
        }
    };

    const serverList = useMemo(() => servers.data ?? [], [servers.data]);
    const suggestedServerId = useMemo(() => {
        if (serverList.length === 0) {
            return 1;
        }

        const usedIds = new Set(serverList.map((server) => server.id));
        let candidate = 1;

        while (usedIds.has(candidate)) {
            candidate += 1;
        }

        return candidate;
    }, [serverList]);
    const hasServers = serverList.length > 0;
    const shouldShowCreateOnly = !servers.isLoading && (!hasServers || servers.error != null);
    const shouldShowCreate = shouldShowCreateOnly || isCreateVisible;

    useEffect(() => {
        if (!hasServers) {
            setActiveServerId(null);
            return;
        }

        if (pendingActiveServerId != null) {
            const pendingExists = serverList.some((server) => server.id === pendingActiveServerId);
            if (pendingExists) {
                setActiveServerId(pendingActiveServerId);
                setPendingActiveServerId(null);
            }
            return;
        }

        if (activeServerId == null || serverList.some((server) => server.id === activeServerId) === false) {
            setActiveServerId(serverList[0].id);
        }
    }, [serverList, hasServers, activeServerId, pendingActiveServerId]);

    const activeServer = serverList.find((server) => server.id === activeServerId);

    const deleteServer = async (serverId: number): Promise<void> => {
        const response = await fetch(`/servers/${serverId}`, { method: 'DELETE' });
        if (response.ok === false) {
            const message = await response.text();
            throw new Error(message || `Unable to delete server (${response.status})`);
        }

        triggerServerRefresh();
    };

    return (
        <>
            <div className="container">
                <Header />

                {(version.isLoading || servers.isLoading) && (
                    <div className="nes-container is-rounded is-dark">
                        <p>Loading...</p>
                    </div>
                )}

                {!servers.isLoading && servers.error && (
                    <div className="nes-container is-rounded is-error">
                        <p>Unable to load existing servers. You can still provision one using the form above.</p>
                        <p className="nes-text is-error">{servers.error.message}</p>
                    </div>
                )}

                {!servers.isLoading && !servers.error && (
                    <>
                        <div className="crankshaft-tabs">
                            {serverList.map((server) => {
                                const isActive = activeServer?.id === server.id;
                                const isRunning = server.state?.state === ServerStatus.Running;
                                const tabStyle = isActive ? 'is-primary' : isRunning ? 'is-dark' : 'is-error';

                                return (
                                    <button
                                        key={server.id}
                                        className={`nes-btn ${tabStyle} crankshaft-tab`}
                                        onClick={() => {
                                            setIsCreateVisible(false);
                                            setActiveServerId(server.id);
                                        }}
                                        type="button"
                                    >
                                        Server {server.id}
                                    </button>
                                );
                            })}
                            <button
                                className="nes-btn is-success crankshaft-tab"
                                onClick={() => setIsCreateVisible(true)}
                                type="button"
                                title="Create new server"
                            >
                                +
                            </button>
                        </div>

                        {!shouldShowCreate && hasServers && activeServer != null && (
                            <Server
                                key={activeServer.id}
                                installers={version.data ?? []}
                                serverId={activeServer.id}
                                onDelete={deleteServer}
                                onStateChange={triggerServerRefresh}
                            />
                        )}

                        {shouldShowCreate && (
                            <CreateServer
                                onCreate={createServer}
                                isBusy={isCreating}
                                suggestedServerId={suggestedServerId}
                            />
                        )}
                    </>
                )}

                {!servers.isLoading && !servers.error && !hasServers && (
                    <div className="nes-container is-rounded is-dark">
                        <p>No servers exist yet. Use the form above to create one.</p>
                    </div>
                )}
            </div>
        </>
    );
};
