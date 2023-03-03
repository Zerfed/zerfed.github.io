var map = L.map('map').setView([41.8781, -87.6298], 11);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 11,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let now = new Date();
now = now.toLocaleString('en-US', {'hour12':false, 'second':'2-digit', 'minute':'2-digit', 'hour':'2-digit', 'day':'2-digit', 'month':'2-digit', 'year':'numeric'})
now = now.substring(6,10)+'-'+now.substring(0,2)+'-'+now.substring(3,5)+'T'+now.substring(12,20)+'.000';  

function grabField(object, field, type) {
    if (!Object.hasOwn(object, field)) {
        return '';
    }
    switch(type) {
        case 'text':
            return object[field].replace(/[-]+/gi,' ').replace(/[^a-z 0-9.,?!]+/gi,'').replace(/ +(?= )/g,'').trim()
        case 'num':
            return parseFloat(object[field].replace(/[^0-9.-]+/gi,''));
        case 'date':
            return object[field].replace(/[^0-9TZ:.-]+/g,'');
    }
}

class Tile {
    locations = []
    associatedWith = new Set()
    nActive = 0
    firstDate = "9999-99-99T00:00:00.000"
    title = ""
    tag = ""

    constructor(t) {
        this.tag = t;
    }

    addLocation(permit) {
        let loc = {};
        loc.title = grabField(permit, 'applicationname', 'text');
        loc.start = grabField(permit, 'applicationstartdate', 'date');
        loc.end = grabField(permit, 'applicationexpiredate', 'date');
        if (!loc.end) {loc.end = grabField(permit, 'applicationenddate', 'date');}
        loc.primary = [grabField(permit, 'primarycontactfirst', 'text'), grabField(permit, 'primarycontactlast', 'text')].join(' ').trim();
        loc.emergency = grabField(permit, 'emergencycontactname', 'text');
        loc.detail = [grabField(permit, 'detail', 'text'), grabField(permit, 'comments', 'text')].join(' / ') + ' (' + loc.title + ')';
        loc.latitude = grabField(permit, 'latitude', 'num');
        loc.longitude = grabField(permit, 'longitude', 'num');
        if((loc.start < now) && (now < loc.end)) { this.nActive += 1; }
        if(loc.start < this.firstDate) { this.firstDate = loc.start; }
        this.associatedWith.add(loc.primary)
        this.associatedWith.add(loc.emergency)
        let k = 0
        while (k < 20 && this.locations.some((ele) => {return Math.abs(ele.longitude - loc.longitude) + Math.abs(ele.latitude - loc.latitude) < 0.000002 * 60})) {
            loc.longitude += 0.000002 * 20;
            k += 1;
        }
        this.locations.push(loc);
    }

    isAssociated(permit) {
        let prim = [grabField(permit, 'primarycontactfirst', 'text'), grabField(permit, 'primarycontactlast', 'text')].join(' ').trim();
        let emer = grabField(permit, 'emergencycontactname', 'text');
        return this.associatedWith.has(prim) || this.associatedWith.has(emer);
    }

    finalize() {
        let A = this.locations.map((val, ind) => {return val.title;}).concat().sort(),
        a1= A[0], a2= A[A.length-1], L= a1.length, k= 0;
        while(k<L && a1.charAt(k) == a2.charAt(k)) k++;
        let better_name = a1.slice(0, k).trim()
        if (better_name.length < 5) {
            better_name = this.locations.map((val, ind) => {return val.title.split(' ')[0];}).sort((a, b) => {return b.length - a.length;})[0];
            if (better_name.length < 2) {
                better_name = 'Unnamed Film';
            }
        }
        this.title = better_name;

        this.locations = this.locations.sort((a, b) => {
            if (a.start > b.start) {return 1;}
            if (a.start < b.start) {return -1;}
            if (a.end > b.end) {return 1;}
            if (a.end < b.end) {return -1;}
            return 0;
        });

        for (let i = 0; i < this.locations.length; i++) {
            if (i > 25) {
                this.locations[i].letter = `${i - 25}`
            } else {
                this.locations[i].letter = String.fromCharCode(i+65);
            }
            this.locations[i].tag = this.tag + `-${i - 25}`
        }
    }


    toHTML() {
        this.finalize();
        let inner = `<input type="checkbox" name="accordion" id="${this.tag}-c"><label for="${this.tag}-c"><mark>${this.title}</mark></label><div class="content"><div class="subcontent">`;
        for (let i = 0; i < this.locations.length; i++) {
            L.marker([this.locations[i].latitude, this.locations[i].longitude], {icon: new L.divIcon({iconSize: [22, 22], iconAnchor: [14, 4], className: "numberCircle", html: this.locations[i].letter})}).bindPopup(this.locations[i].detail).addTo(map)._icon.id = this.locations[i].tag + '-m';

            let styledStart = parseFloat(this.locations[i].start.substring(5,8)).toString()+'/'+this.locations[i].start.substring(8,10);
            let styledEnd = parseFloat(this.locations[i].end.substring(5,8)).toString()+'/'+this.locations[i].end.substring(8,10);
            inner += `<div class="numberCircle L" id="${this.locations[i].tag}">${this.locations[i].letter}</div>&nbsp; <mark>${styledStart}</mark> – <mark>${styledEnd}</mark>&nbsp;<abbr title="${this.locations[i].detail}">${this.locations[i].detail}</abbr><br>`
        }
        inner += `<br></div>${this.locations[0].primary}</div>`;
        let ele = document.createElement('li');
        ele.innerHTML = inner;
        ele.class = 'tile';
        ele.id = this.tag;
        document.getElementById('tile-acc').appendChild(ele);
    }
}



addEventListener("load", (event) => {
    fetch(`https://data.cityofchicago.org/resource/c2az-nhru.json?applicationstatus=Open&$where=applicationenddate%3E%27${now}%27&$select=latitude,%20longitude,%20applicationstartdate,%20applicationexpiredate,%20applicationenddate,%20applicationname,%20comments,%20detail,%20emergencycontactname,%20primarycontactfirst,%20primarycontactlast,%20currentmilestone&$order=applicationstartdate`)
        .then((response) => response.json())
        .then((data) => {
            let tiles = []
            for (let i = 0; i < data.length; i++) {
                if(!Object.hasOwn(data[i], 'latitude') || !Object.hasOwn(data[i], 'longitude')) {
                    continue;
                }
                let ind = tiles.findIndex((ele) => {return ele.isAssociated(data[i])});
                if (ind == -1) {
                    let ins = new Tile('tile-'+tiles.length);
                    ins.addLocation(data[i]);
                    tiles.push(ins);
                } else {
                    tiles[ind].addLocation(data[i]);
                }
            }
            tiles = tiles.sort((a, b) => {
                if (b.nActive > a.nActive) {return 1;}
                if (b.nActive < a.nActive) {return -1;}
                if (a.firstDate > b.firstDate) {return 1;}
                if (a.firstDate < b.firstDate) {return -1;}
                return 0;
            });
            tiles = tiles.filter(ele => ele.locations.length > 0);
            let clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            for (let i = 0; i < tiles.length; i++) {
                let color = `hsl(${Math.round(360 / tiles.length * (2 * i))}, 100%, 70%)`;
                tiles[i].toHTML()
                for (let j = 0; j < tiles[i].locations.length; j++) {
                    document.getElementById(tiles[i].locations[j].tag).style.backgroundColor = color;
                    document.getElementById(tiles[i].locations[j].tag).addEventListener('click', function (event) {
                        map.flyTo([tiles[i].locations[j].latitude + 0.0002, tiles[i].locations[j].longitude], 18);
                        document.getElementById(tiles[i].locations[j].tag + '-m').dispatchEvent(clickEvent);
                    });
                    document.getElementById(tiles[i].locations[j].tag + '-m').style.backgroundColor = color;
                }
                document.getElementById(tiles[i].tag).style.borderLeft = '10px solid '+color;
            }
        });
    });