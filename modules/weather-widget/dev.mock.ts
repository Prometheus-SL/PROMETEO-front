import { HttpResponse, http } from "msw";
import { z } from "zod";

import { createMswModuleDevMockAdapter } from "@/dev/modules";

const weatherMockStateSchema = z.object({
    city: z.string().default("Madrid"),
    temp: z.number().default(22),
    feelsLike: z.number().default(20),
    humidity: z.number().default(48),
    windSpeed: z.number().default(3.5),
    weatherId: z.number().default(800),
    weatherMain: z.string().default("Clear"),
    weatherDescription: z.string().default("cielo despejado"),
    weatherIcon: z.string().default("01d"),
});

type WeatherMockState = z.infer<typeof weatherMockStateSchema>;

function buildHandlers(state: WeatherMockState) {
    return [
        http.get("https://api.openweathermap.org/data/2.5/weather", () => {
            return HttpResponse.json({
                weather: [
                    {
                        id: state.weatherId,
                        main: state.weatherMain,
                        description: state.weatherDescription,
                        icon: state.weatherIcon,
                    },
                ],
                main: {
                    temp: state.temp,
                    feels_like: state.feelsLike,
                    humidity: state.humidity,
                },
                wind: { speed: state.windSpeed },
                name: state.city,
            });
        }),
    ];
}

const adapter = createMswModuleDevMockAdapter<WeatherMockState>({
    stateSchema: weatherMockStateSchema,
    buildHandlers,
});

export default adapter;
