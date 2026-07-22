import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MapboxService {
	private readonly accessToken: string;

	constructor(private readonly configService: ConfigService) {
		this.accessToken =
			this.configService.get<string>('MAPBOX_ACCESS_TOKEN') ?? '';
	}

	async getRoute(params: {
		pickupLat: number;
		pickupLng: number;
		dropoffLat: number;
		dropoffLng: number;
		vehicleType: string;
	}): Promise<{
		distanceKm: number;
		durationMin: number;
		geometry: string;
	}> {
		const profile =
			params.vehicleType === 'MOTO' ? 'driving' : 'driving-traffic';
		const coordinates = `${params.pickupLng},${params.pickupLat};${params.dropoffLng},${params.dropoffLat}`;
		const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?access_token=${this.accessToken}&geometries=geojson&overview=full&alternatives=false`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`Mapbox Directions API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as {
			routes: Array<{
				distance: number;
				duration: number;
				geometry: {
					type: string;
					coordinates: Array<[number, number]>;
				};
			}>;
			code: string;
		};

		if (!data.routes || data.routes.length === 0) {
			throw new Error('Mapbox returned no routes');
		}

		const route = data.routes[0];
		return {
			distanceKm: Math.round((route.distance / 1000) * 100) / 100,
			durationMin: Math.max(1, Math.round(route.duration / 60)),
			geometry: JSON.stringify(route.geometry),
		};
	}
}
