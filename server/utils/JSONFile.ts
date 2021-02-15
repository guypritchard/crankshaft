import * as fs from 'fs';

export class JSONFile {
    public static read<T>(path: string): T {
        try {
            const versionJSON = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
            if (versionJSON != null) {
                return JSON.parse(versionJSON) as T;
            }
        } catch (e) {
            console.error(e);
        }

        throw new Error(`Couldn't find or load ${path}`);
    }

    public static write<T>(path: string, data: T): void {
        fs.writeFileSync(path, JSON.stringify(data));
    }
}
