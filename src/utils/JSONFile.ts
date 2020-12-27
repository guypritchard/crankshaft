import fs from 'fs';

export class JSONFile<T> {
    public static read<T>(path: string): T|null {
        try {
            const versionJSON = fs.readFileSync(path, {encoding:'utf8', flag:'r'});
            if (versionJSON != null) {
                return JSON.parse(versionJSON) as T
            }
        }
        catch {
        }

        return null;
    }

    public static write<T>(path: string, data: T): void {
        fs.writeFileSync(path, JSON.stringify(data));
    }
}