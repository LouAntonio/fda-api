export function generateSlug(text: string): string {
	let slug = text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-+/g, '-');

	if (!slug) slug = 'evento';

	return slug;
}
