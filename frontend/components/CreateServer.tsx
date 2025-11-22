import React, { useEffect, useState } from 'react';
import { Spinner } from './Spinner';
import { MinecraftEdition } from '../../interfaces/types';

export interface CreateServerProps {
    onCreate: (id: number, port?: number, edition?: MinecraftEdition, maxMemoryMb?: number) => Promise<void>;
    isBusy: boolean;
    suggestedServerId?: number;
}

export const CreateServer: React.FC<CreateServerProps> = ({ onCreate, isBusy, suggestedServerId }) => {
    const [serverId, setServerId] = useState('');
    const [port, setPort] = useState('');
    const [edition, setEdition] = useState<MinecraftEdition>(MinecraftEdition.Bedrock);
    const [maxMemoryMb, setMaxMemoryMb] = useState('2048');
    const [error, setError] = useState<string | null>(null);
    const [autoPort, setAutoPort] = useState(true);

    useEffect(() => {
        if (suggestedServerId == null) {
            return;
        }

        setServerId((current) => {
            if (current.trim().length > 0) {
                return current;
            }

            return suggestedServerId.toString();
        });
    }, [suggestedServerId]);

    const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setError(null);

        const parsedId = Number(serverId);
        const parsedPort = autoPort || port.trim().length === 0 ? undefined : Number(port);
        const parsedMemory =
            edition === MinecraftEdition.Java && maxMemoryMb.trim().length > 0 ? Number(maxMemoryMb) : undefined;

        if (Number.isNaN(parsedId)) {
            setError('Server ID must be a number.');
            return;
        }

        if (autoPort === false && parsedPort == null) {
            setError('Port must be provided when auto-select is disabled.');
            return;
        }

        if (parsedPort != null && Number.isNaN(parsedPort)) {
            setError('Port must be a number.');
            return;
        }

        if (edition === MinecraftEdition.Java && parsedMemory != null && Number.isNaN(parsedMemory)) {
            setError('Memory must be a number of megabytes.');
            return;
        }

        try {
            await onCreate(parsedId, parsedPort, edition, parsedMemory);
            setServerId('');
            setPort('');
            setEdition(MinecraftEdition.Bedrock);
            setMaxMemoryMb('2048');
            setAutoPort(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unable to create server.';
            setError(message);
        }
    };

    return (
        <section className="nes-container is-rounded is-dark">
            {isBusy && <Spinner></Spinner>}
            <h2>Create New Server</h2>
            <form className="crankshaft-create-server" onSubmit={submit}>
                <div className="nes-field">
                    <label htmlFor="create-server-id">Server ID</label>
                    <input
                        id="create-server-id"
                        type="number"
                        min="0"
                        className="nes-input"
                        value={serverId}
                        onChange={(event) => setServerId(event.target.value)}
                        placeholder="e.g. 2"
                    />
                </div>
                <div className="nes-field">
                    <label htmlFor="create-server-port">Port (optional)</label>
                    <input
                        id="create-server-port"
                        type="number"
                        className="nes-input"
                        value={port}
                        onChange={(event) => setPort(event.target.value)}
                        placeholder="Leave blank to auto-select"
                        disabled={autoPort}
                    />
                    <label className="crankshaft-inline-control">
                        <input
                            type="checkbox"
                            className="nes-checkbox"
                            checked={autoPort}
                            onChange={(event) => {
                                const isChecked = event.target.checked;
                                setAutoPort(isChecked);
                                if (isChecked) {
                                    setPort('');
                                }
                            }}
                        />
                        <span>Auto select port</span>
                    </label>
                </div>
                <div className="nes-field full-row">
                    <label>Edition</label>
                    <div className="crankshaft-choice-group">
                        <label className="crankshaft-inline-control">
                            <input
                                type="radio"
                                className="nes-radio"
                                name="edition"
                                value={MinecraftEdition.Bedrock}
                                checked={edition === MinecraftEdition.Bedrock}
                                onChange={() => setEdition(MinecraftEdition.Bedrock)}
                            />
                            <span>Bedrock</span>
                        </label>
                        <label className="crankshaft-inline-control">
                            <input
                                type="radio"
                                className="nes-radio"
                                name="edition"
                                value={MinecraftEdition.Java}
                                checked={edition === MinecraftEdition.Java}
                                onChange={() => setEdition(MinecraftEdition.Java)}
                            />
                            <span>Java</span>
                        </label>
                    </div>
                </div>

                {edition === MinecraftEdition.Java && (
                    <div className="nes-field">
                        <label htmlFor="create-server-memory">Max memory (MB)</label>
                        <input
                            id="create-server-memory"
                            type="number"
                            className="nes-input"
                            value={maxMemoryMb}
                            onChange={(event) => setMaxMemoryMb(event.target.value)}
                            placeholder="e.g. 2048"
                        />
                        <p className="nes-text is-warning" style={{ marginTop: '0.25rem' }}>
                            Java edition requires a local Java runtime. Crankshaft will accept the EULA automatically.
                        </p>
                    </div>
                )}
                <button type="submit" className="nes-btn is-primary" disabled={isBusy}>
                    Create
                </button>
            </form>
            {error && <p className="nes-text is-error">{error}</p>}
        </section>
    );
};
