const { exec } = require("child_process");

const ExecQueue = function() {
    this.buffer = [];
    this.isRunning = false;
}

ExecQueue.prototype.add = function(cmd, arg1, arg2) {
    if (typeof arg1 === "function") {
        this.buffer.push({ cmd, callback: arg1 });
    } else if (typeof arg2 === "function") {
        this.buffer.push({ cmd, options: arg1, callback: arg2 });
    }
    if (!this.isRunning) {
        this.process();
    }
}

ExecQueue.prototype.process = function() {
    if (this.buffer.length) {
        const self = this;
        const { cmd, options, callback } = this.buffer.shift();
        this.isRunning = true;
        exec(cmd, options, function(){
            callback.apply(null, arguments);
            self.process();
        });
    } else {
        this.isRunning = false;
    }
}

module.exports = ExecQueue;
