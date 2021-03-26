const { exec } = require("child_process");

const ExecQueue = function() {
    this.buffer = [];
    this.isRunning = false;
}

ExecQueue.prototype.add = function(cmd, callback) {
    this.buffer.push({ cmd, callback });
    if (!this.isRunning) {
        this.process();
    }
}

ExecQueue.prototype.process = function() {
    if (this.buffer.length) {
        const self = this;
        const { cmd, callback } = this.buffer.shift();
        this.isRunning = true;
        exec(cmd, function(){
            callback.apply(null, arguments);
            self.process();
        });
    } else {
        this.isRunning = false;
    }
}

module.exports = ExecQueue;
