export function coordsToWkt(lat: number, lng: number): string {
	return `POINT(${lng} ${lat})`;
}
