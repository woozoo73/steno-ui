Vue.filter("comma", v => {
    if (!v) {
        return v;
    }
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
});

Vue.filter("dash", v => {
    if (v) {
        return v;
    }
    return '-';
});

Vue.filter("date-time", date => {
    if (!date) {
        return date;
    }
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    month = month >= 10 ? month : '0' + month;
    let day = date.getDate();
    day = day >= 10 ? day : '0' + day;
    let hour = date.getHours();
    hour = hour >= 10 ? hour : '0' + hour;
    let min = date.getMinutes();
    let sec = date.getSeconds();
    sec = sec >= 10 ? sec : '0' + sec;

    return year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
});
