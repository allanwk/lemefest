<template>
    <div 
      class="numbered-checkbox"
      :class="{ 'checked': isChecked, 'disabled': disabled }"
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
      disabled: {
        type: Boolean,
        default: false
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
      }
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
    width: 24px;
    height: 24px;
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
  
  .numbered-checkbox.disabled {
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