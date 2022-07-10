const app = new Vue({
    el: '#app',
    data: {
        mermaidThemes: [
            'forest',
            'default',
            'dark',
            'neutral'],
        linkTypes: [
            'IntelliJ',
            'GitHub',
            'GitLab'
        ],
        linkPatterns: [
            'http://localhost:63342/api/file/src/main/java/',
            'https://github.com/{account}/{repository}/blob/master/src/main/java/',
            'https://gitlab.com/{account}/{repository}/-/blob/main/src/main/java/',
        ],
        mermaidTheme: 'forest',
        linkType: 'IntelliJ',
        linkBaseUrl: 'http://localhost:63342/api/file/src/main/java/'
    },
    mounted: function () {
        this.clear();
        this.loadValues();
    },
    methods: {
        clear: function () {
            this.mermaidTheme = 'forest';
            this.linkType = 'IntelliJ';
            this.linkBaseUrl = 'http://localhost:63342/api/file/src/main/java/';
        },
        loadValues: function () {
            this.clear();
            const sessionStorage = this.getSessionStorage();
            if (sessionStorage) {
                const mermaidTheme = sessionStorage.getItem('mermaidTheme');
                const linkType = sessionStorage.getItem('linkType');
                const linkBaseUrl = sessionStorage.getItem('linkBaseUrl');
                if (mermaidTheme) {
                    this.mermaidTheme = mermaidTheme;
                }
                if (linkType) {
                    this.linkType = linkType;
                }
                if (linkBaseUrl) {
                    this.linkBaseUrl = linkBaseUrl;
                }
            }
        },
        save: function() {
            const sessionStorage = this.getSessionStorage();
            if (sessionStorage) {
                sessionStorage.setItem('mermaidTheme', this.mermaidTheme);
                sessionStorage.setItem('linkType', this.linkType);
                sessionStorage.setItem('linkBaseUrl', this.linkBaseUrl);
            }
            this.clear();
            this.loadValues();
        },
        reset: function() {
            const sessionStorage = this.getSessionStorage();
            if (sessionStorage) {
                sessionStorage.removeItem('mermaidTheme');
                sessionStorage.removeItem('linkType');
                sessionStorage.removeItem('linkBaseUrl');
            }
            this.clear();
            this.loadValues();
        },
        getSessionStorage: function() {
            const sessionStorage = window.sessionStorage;
            return sessionStorage;
        },
        onchangeLinkType: function() {
            const index = document.getElementById('linkType').selectedIndex;
            app.linkBaseUrl = app.linkPatterns[index];
        }
    }
});
