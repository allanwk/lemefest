<template>
    <div 
      class="numbered-checkbox"
      :class="{ 'checked': isChecked, 'disabled-cursor': state === 1, 'disabled-light': state === 2, 'disabled-dark': state === 3 }"
      @click="toggle"
    >
      <input
        type="checkbox"
        :value="value"
        v-model="internalValue"
        class="hidden-checkbox"
        :disabled="disabled"
        :readonly="readonly"
        @change="handleChange"
      />
      <span class="checkbox-number">{{ number }}</span>
    </div>
  </template>
  
  <script>
  export default {
    name: 'NumberedCheckbox',
    model: {
      prop: 'modelValue',
      event: 'change'
    },
    props: {
      value: {
        type: [String, Number, Boolean, Object],
        required: true
      },
      modelValue: {
        type: [Array, Boolean],
        default: () => []
      },
      number: {
        type: Number,
        required: true
      },
      state: {
        type: Number,
        required: true,
      },
      readonly: {
        type: Boolean,
        default: false
      }
    },
    computed: {
      internalValue: {
        get() {
          return this.modelValue
        },
        set(value) {
          this.$emit('change', value)
        }
      },
      isChecked() {
        if (Array.isArray(this.modelValue)) {
          return this.modelValue.includes(this.value)
        }
        return this.modelValue
      },
      disabled() {
        return this.state > 0;
      },
    },
    methods: {
      toggle() {
        if (this.disabled) return
        
        if (Array.isArray(this.modelValue)) {
          const newValue = [...this.modelValue]
          const index = newValue.indexOf(this.value)
          
          if (index === -1) {
            newValue.push(this.value)
          } else {
            newValue.splice(index, 1)
          }
          
          this.$emit('change', newValue)
        } else {
          this.$emit('change', !this.modelValue)
        }
      },
      handleChange(event) {
        this.$emit('change', event.target.checked)
      }
    }
  }
  </script>
  
  <style scoped>
  .numbered-checkbox {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border: 2px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s;
  }
  
  .numbered-checkbox.checked {
    border-color: #000084;
    background-color: #000084;
  }

  .numbered-checkbox.disabled-cursor {
    cursor: not-allowed;
  }
  
  .numbered-checkbox.disabled-light {
    border-color: rgb(204, 200, 200);
    background-color: rgb(204, 200, 200);
    cursor: not-allowed;
  }

  .numbered-checkbox.disabled-dark {
    border-color: grey;
    background-color: grey;
    cursor: not-allowed;
  }
  
  .checkbox-number {
    font-size: 14px;
    font-weight: bold;
    color: #333;
  }
  
  .numbered-checkbox.checked .checkbox-number {
    color: white;
  }
  
  .hidden-checkbox {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    margin: 0;
    padding: 0;
  }
  </style>