import { Platform } from './Platform';

export interface BedrockVersion {
    platform: Platform;
    version: string;
    url: string;
    filename: string;
}
