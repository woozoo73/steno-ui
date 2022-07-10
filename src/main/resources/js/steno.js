class AdonisTrack {

    getInvocations() {
        let invocations = null;
        $.ajax({
            url: this.getApiRoot() + "/adonis-track/invocations",
            method: "GET",
            dataType: "json",
            async: false,
            success: function(data) {
                invocations = data;
            }
        })

        return invocations;
    }

    getInvocation(id) {
        let invocation = null;
        $.ajax({
            url: this.getApiRoot() + "/adonis-track/invocations/" + id,
            method: "GET",
            dataType: "json",
            async: false,
            success: function(data) {
                invocation = data;
            }
        })

        return invocation;
    }

    getApiRoot() {
        const locations = window.location.href.split("/");
        const apiRoot = locations[0] + "//" + locations[2];

        return apiRoot;
    }

}
