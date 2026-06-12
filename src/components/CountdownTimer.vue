<template>
    <v-card class="countdown-timer py-0" outlined>
      <v-card-text class="text-center py-0">
        {{ message }}
        <div class="time-display text-h5 font-weight-bold">
          {{ formattedMinutes }}:{{ formattedSeconds }}
        </div>
        
        <v-card-actions class="justify-center" v-if="showControls">
          <v-btn 
            color="primary" 
            @click="toggleTimer"
            :disabled="remainingTime <= 0"
          >
            {{ isRunning ? 'Pause' : 'Start' }}
          </v-btn>
          <v-btn 
            color="secondary" 
            @click="resetTimer"
            :disabled="remainingTime === initialTime"
          >
            Reset
          </v-btn>
        </v-card-actions>
      </v-card-text>
    </v-card>
  </template>
  
  <script>
  export default {
    name: 'CountdownTimer',
    props: {
      // Initial time in seconds
      initialTime: {
        type: Number,
        required: true,
        validator: value => value >= 0
      },
      // Whether to show control buttons
      showControls: {
        type: Boolean,
        default: false
      },
      // Auto-start the timer on mount
      autoStart: {
        type: Boolean,
        default: false
      },
      message: {
        type: String,
      }
    },
    data() {
      return {
        remainingTime: this.initialTime,
        targetTime: null,
        timer: null,
        isRunning: false
      }
    },
    computed: {
      formattedMinutes() {
        const minutes = Math.floor(this.remainingTime / 60)
        return minutes.toString().padStart(2, '0')
      },
      formattedSeconds() {
        const seconds = this.remainingTime % 60
        return seconds.toString().padStart(2, '0')
      },
      timeWarning() {
        return this.remainingTime <= 10
      },
      timeCritical() {
        return this.remainingTime <= 5
      }
    },
    watch: {
      initialTime(newTime) {
        this.resetTimer(newTime)
      }
    },
    mounted() {
      document.addEventListener('visibilitychange', this.onVisibilityChange)
      if (this.autoStart) {
        this.startTimer()
      }
    },
    beforeDestroy() {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
      this.clearTimer()
    },
    methods: {
      startTimer() {
        this.clearTimer()
        if (this.remainingTime > 0) {
          this.isRunning = true
          this.targetTime = Date.now() + this.remainingTime * 1000
          this.timer = setInterval(this.updateRemainingTime, 1000)
        }
      },
      updateRemainingTime() {
        this.remainingTime = Math.max(0, Math.ceil((this.targetTime - Date.now()) / 1000))

        if (this.remainingTime <= 0) {
          this.clearTimer()
          this.isRunning = false
          this.targetTime = null
          this.$emit('timerEnd')
        }
      },
      onVisibilityChange() {
        if (document.visibilityState === 'visible' && this.isRunning && this.targetTime != null) {
          this.updateRemainingTime()
        }
      },
      pauseTimer() {
        if (this.isRunning && this.targetTime != null) {
          this.remainingTime = Math.max(0, Math.ceil((this.targetTime - Date.now()) / 1000))
        }
        this.targetTime = null
        this.clearTimer()
        this.isRunning = false
      },
      toggleTimer() {
        if (this.isRunning) {
          this.pauseTimer()
        } else {
          this.startTimer()
        }
      },
      resetTimer(newTime = this.initialTime) {
        this.pauseTimer()
        this.remainingTime = newTime
        this.$emit('timer-reset')
      },
      clearTimer() {
        if (this.timer) {
          clearInterval(this.timer)
          this.timer = null
        }
      },
      addTime(seconds) {
        this.remainingTime += seconds
        if (this.isRunning && this.targetTime != null) {
          this.targetTime += seconds * 1000
        } else if (this.remainingTime > 0) {
          this.startTimer()
        }
      },
      setTime(seconds) {
        this.resetTimer(seconds)
      }
    }
  }
  </script>
  
  <style scoped>
  .countdown-timer {
    max-width: 300px;
    margin: 0 auto;
  }
  
  .time-display {
    font-family: monospace;
    color: var(--v-primary-base);
    white-space: nowrap;
  }
  
  .time-display.warning {
    color: var(--v-warning-base);
    animation: pulse 1s infinite;
  }
  
  .time-display.critical {
    color: var(--v-error-base);
    animation: pulse 0.5s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  </style>