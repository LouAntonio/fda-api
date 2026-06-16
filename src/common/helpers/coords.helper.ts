export function coordsToWkt(lat: number, lng: number): string {
	return `POINT(${lng} ${lat})`;
}

export function polygonToWkt(coordinates: number[][]): string {
	const points = coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
	return `POLYGON((${points}))`;
}
