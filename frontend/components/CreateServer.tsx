import React, { useEffect, useState } from 'react';
import { Spinner } from './Spinner';

export interface CreateServerProps {
  onCreate: (id: number, port?: number) => Promise<void>;
  isBusy: boolean;
  suggestedServerId?: number;
}

export const CreateServer: React.FC<CreateServerProps> = ({ onCreate, isBusy, suggestedServerId }) => {
  const [serverId, setServerId] = useState('');
  const [port, setPort] = useState('');
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

    try {
      await onCreate(parsedId, parsedPort);
      setServerId('');
      setPort('');
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
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
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
        <button type="submit" className="nes-btn is-primary" disabled={isBusy}>
          Create
        </button>
      </form>
      {error && <p className="nes-text is-error">{error}</p>}
    </section>
  );
};
