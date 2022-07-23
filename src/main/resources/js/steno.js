class Steno {

    getStories() {
        let stories = null;
        $.ajax({
            url: this.getApiRoot() + "/steno/stories",
            method: "GET",
            dataType: "json",
            async: false,
            success: function(data) {
                stories = data;
            }
        })

        return stories;
    }

    getInvocation(id) {
        let story = null;
        $.ajax({
            url: this.getApiRoot() + "/steno/stories/" + id,
            method: "GET",
            dataType: "json",
            async: false,
            success: function(data) {
                story = data;
            }
        })

        return story;
    }

    getApiRoot() {
        const locations = window.location.href.split("/");
        const apiRoot = locations[0] + "//" + locations[2];

        return apiRoot;
    }

}
