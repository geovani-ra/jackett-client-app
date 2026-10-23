
export function formatBytes(bytes?: number): string {
    if (bytes == null || Number.isNaN(bytes)) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDate(iso?: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    });
}

export function formatSeeders(seeders?: number): string {
    if (seeders == null) return '?';
    return String(seeders);
}

export function seederColor(seeders?: number): string {
    if (seeders == null) return '#9E9E9E';
    if (seeders >= 50) return '#2E7D32';
    if (seeders >= 10) return '#7CB342';
    if (seeders >= 1) return '#F9A825';
    return '#C62828';
}

export const CATEGORIES: { id: string; label: string }[] = [
    { id: '', label: 'Todos' },
    { id: '2000', label: 'Filmes' },
    { id: '5000', label: 'Séries' },
    { id: '3000', label: 'Música' },
    { id: '4000', label: 'PC' },
    { id: '1000', label: 'Console' },
    { id: '8000', label: 'Livros' },
    { id: '7000', label: 'Outros' },
];
