export interface WledSegment {
    id: number;
    start: number;
    stop: number;
    len: number;
    grp: number;
    spc: number;
    of: number;
    on: boolean;
    bri: number;
    cct: number;
    col: number[][];
    fx: number;
    sx: number;
    ix: number;
    pal: number;
    sel: boolean;
    rev: boolean;
    mi: boolean;
    n?: string;
}

export interface WledNightlight {
    on: boolean;
    dur: number;
    mode: number;
    tbri: number;
    rem: number;
}

export interface WledUdpSync {
    send: boolean;
    recv: boolean;
}

export interface WledState {
    on: boolean;
    bri: number;
    transition: number;
    ps: number;
    pl: number;
    nl: WledNightlight;
    udpn: WledUdpSync;
    seg: WledSegment[];
    mainseg: number;
}

export interface WledLeds {
    count: number;
    rgbw: boolean;
    wv: boolean;
    cct: boolean;
    fps: number;
    pwr: number;
    maxpwr: number;
    maxseg: number;
    seglc: number[];
    lc: number;
}

export interface WledWifi {
    bssid: string;
    signal: number;
    channel: number;
}

export interface WledInfo {
    ver: string;
    vid: number;
    leds: WledLeds;
    name: string;
    udpport: number;
    live: boolean;
    fxcount: number;
    palcount: number;
    wifi: WledWifi;
    arch: string;
    core: string;
    freeheap: number;
    uptime: number;
    brand: string;
    product: string;
    mac: string;
    ip: string;
}

export interface WledFullResponse {
    state: WledState;
    info: WledInfo;
    effects: string[];
    palettes: string[];
}

export interface WledEffect {
    id: number;
    name: string;
}

export interface WledPalette {
    id: number;
    name: string;
}
