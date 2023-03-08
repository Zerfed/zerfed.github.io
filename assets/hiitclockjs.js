function clamp(num, min, max) {
    if(num == null) {
    return min;
    }
    return num <= min 
      ? min 
      : num >= max 
        ? max 
        : num;
}

var beep = new Audio('./assets/beep.mp3');
var sets;
var prep;
var work;
var rest;
var cool;
var total;
var time_in_seconds;
var current_time;
var deadline;
var clock;
var pause;
var timerpage;
var stats;

function time_remaining(endtime){
	var t = Date.parse(endtime) - Date.parse(new Date());
	var seconds = Math.floor( (t/1000) % 60 );
	var minutes = Math.floor( (t/1000/60) );
	return {'total':t, 'minutes':minutes, 'seconds':seconds};
}

function update_clock(){
    let t = time_remaining(deadline);
    if (t.total <= 0) {
        clearInterval(timeinterval);
        clock.innerHTML = '0';
        stats.innerHTML = 'DONE'
    } else {
        let i = getstage(t.total/1000);
        let remaining = t.total/1000 - stagefloor(i);
        let elapsed = stagefloor(i - 1) - t.total/1000;
        clock.innerHTML = t.total/1000 - stagefloor(i);
        if (remaining == 1 ) {
            setTimeout(() => {beep.currentTime = 0; beep.play();}, 600);
            setTimeout(() => {beep.currentTime = 0; beep.play();}, 900);
        }
        if (i <= 0) {
            stats.innerHTML = 'PREP';
            clock.className = '';
        } else if (i >= 2*sets) {
            stats.innerHTML = 'COOL';
            clock.className = '';
            if (remaining == 1 ) {
                setTimeout(() => {beep.currentTime = 0; beep.play();}, 000);
                setTimeout(() => {beep.currentTime = 0; beep.play();}, 300);
            }
        } else if (i % 2 == 1) {
            stats.innerHTML = 'WORK';
            clock.className = 'work';
        } else {
            stats.innerHTML = 'REST';
            clock.className = '';
        }

        if (elapsed > 5) {
            let tm = ''
            tm += t.minutes
            tm += ':'
            if (t.seconds<10) {tm += '0'}
            tm += t.seconds;
            stats.innerHTML = tm;
        }
    }
}

var timeinterval;
function run_clock(){
	update_clock();
	timeinterval = setInterval(update_clock,1000);
}

var paused = false;
var time_left;
function pause_clock(){
	if(!paused){
		paused = true;
		clearInterval(timeinterval); // stop the clock
		time_left = time_remaining(deadline).total; // preserve remaining time
        pause.className = "paused";
	} else {
        clearInterval(timeinterval);
        paused = false;
		deadline = new Date(Date.parse(new Date()) + time_left);
		run_clock();
        pause.className = "";
    }
}

function getstage(s_time) {
    if (s_time - 0.5 >= prep + cool + sets * work + (sets - 1) * rest) {
        return -1;
    }
    if (s_time - 0.5 >= cool + sets * work + (sets - 1) * rest) {
        return 0;
    }
    if (s_time - 0.5 <= cool) {
        return 2 * sets;
    }
    if ( (s_time - 0.5 - cool) % (work + rest) < work) {
        return 2 * sets - 2 * Math.floor((s_time - 0.1 - cool) / (work + rest)) - 1;
    }
    return 2 * sets - 2 * Math.floor((s_time - 0.1 - cool) / (work + rest)) - 2;
}

function stagefloor(s_stage) {
    if (s_stage < 0) {
        return prep + cool + sets * work + (sets - 1) * rest;
    }
    if (s_stage == 0) {
        return cool + sets * work + (sets - 1) * rest;
    }
    if (s_stage >= 2 * sets) {
        return 0;
    }
    return cool + (sets - Math.floor(s_stage / 2 + 1/2)) * work + (sets - Math.floor(s_stage / 2 + 1)) * rest;
}

addEventListener("load", (event) => {
    clock = document.getElementById('time');
    pause = document.getElementById('pause');
    timerpage = document.getElementById('maintimer');
    stats = document.getElementById('status');

    document.getElementById("launch").addEventListener("click", (event) => {
        document.getElementById("launch").blur();
        clearInterval(timeinterval);
        sets = clamp(parseFloat(document.getElementById('fsets').value), 1, 99);
        prep = clamp(parseFloat(document.getElementById('fprep').value), 0, 300);
        cool = clamp(parseFloat(document.getElementById('fcool').value), 0, 300);
        work = clamp(parseFloat(document.getElementById('fwork').value), 1, 300);
        rest = clamp(parseFloat(document.getElementById('frest').value), 1, 300);
        total = prep + cool + sets * work + (sets - 1) * rest;
        time_in_seconds = prep + cool + sets * work + (sets - 1) * rest;

        timerpage.className = 'timer fullscreen';

        current_time = Date.parse(new Date());
        deadline = new Date(current_time + time_in_seconds*1000);
        run_clock();
    });

    pause.addEventListener("click", (event) => {
        pause.blur();
        pause_clock();
    });

    document.addEventListener('keyup', event => {
        if (event.code === 'Space') {
            pause_clock();
        }
    });

    document.getElementById("forward").addEventListener("click", (event) => {
        document.getElementById("forward").blur();
        let t = time_remaining(deadline);
        if (paused) {
            current_time = Date.parse(new Date());
            deadline = new Date(current_time + stagefloor(getstage(t.total / 1000))*1000);
            time_left = time_remaining(deadline).total;
            update_clock();
        } else {
            clearInterval(timeinterval);
            current_time = Date.parse(new Date());
            deadline = new Date(current_time + stagefloor(getstage(t.total / 1000))*1000);
            run_clock();
        }
    });

    document.getElementById("back").addEventListener("click", (event) => {
        document.getElementById("back").blur();
        let t = time_remaining(deadline);
        if (paused) {
            current_time = Date.parse(new Date());
            deadline = new Date(current_time + stagefloor(getstage(t.total / 1000 + 1) - 1)*1000);
            time_left = time_remaining(deadline).total;
            update_clock();
        } else {
            clearInterval(timeinterval);
            current_time = Date.parse(new Date());
            deadline = new Date(current_time + stagefloor(getstage(t.total / 1000 + 1) - 1)*1000);
            run_clock();
        }
    });
    
    document.getElementById("exit").addEventListener("click", (event) => {
        document.getElementById("exit").blur();
        if (paused) {pause_clock()};
        clearInterval(timeinterval);
        timerpage.className = 'timer';
    });
});
