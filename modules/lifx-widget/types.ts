export interface LifxLight {
    id: string;
    uuid: string;
    label: string;
    connected: boolean;
    power: "on" | "off";
    brightness: number;
    color: {
        hue: number;
        saturation: number;
        kelvin: number;
    };
    product: {
        name: string;
        identifier: string;
        company: string;
        capabilities: {
            has_color: boolean;
            has_variable_color_temp: boolean;
            has_infrared: boolean;
            has_multizone: boolean;
            min_kelvin: number;
            max_kelvin: number;
        };
    };
    last_seen: string;
    seconds_since_seen: number;
    group: {
        id: string;
        name: string;
    };
}

export interface LifxGroup {
    id: string;
    name: string;
    lights: LifxLight[];
}

export interface LifxApiResponse {
    results: LifxLight[];
    operations: Array<{
        operation: string;
        status: string;
    }>;
}
