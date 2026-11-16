const mangayomiSources = [{
    "name": "Internet Archive (Anime)",
    "lang": "en",
    "baseUrl": "https://archive.org",
    "apiUrl": "https://archive.org",
    "iconUrl": "https://archive.org",
    "typeSource": "single",
    "itemType": 1,
    "isNsfw": false,
    "version": "0.0.1",
    "pkgPath": "anime/src/en/archive_org.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    async fetchItems(query, page) {
        const searchUrl = `${this.source.baseUrl}/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title&rows=20&page=${page}&output=json`;
        const res = await this.client.get(searchUrl);
        const data = JSON.parse(res.body);
        const docs = data?.response?.docs || [];

        const list = docs.map(doc => ({
            name: Array.isArray(doc.title) ? doc.title[0] : (doc.title || doc.identifier),
            link: `/details/${doc.identifier}`,
            imageUrl: `${this.source.baseUrl}/services/img/${doc.identifier}`
        }));

        const totalFound = data?.response?.numFound || 0;
        const hasNextPage = (page * 20) < totalFound;
        return { list, hasNextPage };
    }

    async getPopular(page) {
        return await this.fetchItems("mediatype:(movies) AND subject:(anime)", page);
    }

    async getLatestUpdates(page) {
        return await this.fetchItems("mediatype:(movies) AND subject:(anime)", page);
    }

    async search(query, page, filters) {
        const q = query ? `mediatype:(movies) AND (${query})` : "mediatype:(movies) AND subject:(anime)";
        return await this.fetchItems(q, page);
    }

    async getDetail(url) {
        const parts = url.split("/details/");
        const identifier = parts[parts.length - 1].split("/")[0];
        const metaUrl = `${this.source.baseUrl}/metadata/${identifier}`;
        const res = await this.client.get(metaUrl);
        const data = JSON.parse(res.body);

        const meta = data?.metadata || {};
        const files = data?.files || [];

        // Prefer original playable files; fall back to Archive.org's auto-converted MP4s
        let videoFiles = files.filter(f =>
            f.name &&
            (f.name.endsWith(".mp4") || f.name.endsWith(".mkv") || f.name.endsWith(".webm")) &&
            f.source === "original"
        );

        if (videoFiles.length === 0) {
            videoFiles = files.filter(f => f.name && f.name.endsWith(".mp4"));
        }

        const chapters = videoFiles.map((file, idx) => ({
            name: file.title || file.name || `Episode ${idx + 1}`,
            url: `${this.source.baseUrl}/download/${identifier}/${encodeURIComponent(file.name)}`
        }));

        return {
            name: Array.isArray(meta.title) ? meta.title[0] : (meta.title || identifier),
            imageUrl: `${this.source.baseUrl}/services/img/${identifier}`,
            description: Array.isArray(meta.description) ? meta.description.join("\n") : (meta.description || ""),
            author: Array.isArray(meta.creator) ? meta.creator.join(", ") : (meta.creator || "Archive.org"),
            status: 1,
            episodes: chapters
        };
    }

    async getVideoList(url) {
        return [{
            url: url,
            originalUrl: url,
            quality: "Archive.org Direct"
        }];
    }
}
