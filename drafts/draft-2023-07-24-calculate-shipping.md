---
layout: post
title:  "Паттерн Адаптер для расчета доставки"
date:   2023-07-24 08:52:48 +0300
categories: singleton
toc: true
menubar_toc: true
hero_image: /images/rubu-back.jpeg
hero_darken: true
---

<img alt="ded" src="/images/sleep.jpeg" width="40%"/>
# пример паттерна Adapter на Ruby

## В двух словах об Паттерне Адаптер
Паттерн Адаптер (Adapter) - это структурный паттерн проектирования, который позволяет объектам с несовместимыми интерфейсами работать вместе. Он предоставляет промежуточный адаптер, который преобразует интерфейс одного класса в интерфейс, ожидаемый другим классом.

Основная цель паттерна Адаптер - обеспечить взаимодействие между классами, которые без него не могли бы работать вместе из-за несовместимости их интерфейсов. Адаптер преобразует вызовы методов одного класса в вызовы методов другого класса, чтобы обеспечить совместимость.

## Пример Ruby кода паттерн Adapter

Делаем расчет доставки на Ruby использую паттерн Adapter

В этом примере у нас два класса `ShippingCalculatorPost` и `ShippingCalculatorVip`, которые предоставляют функциональность расчета стоимости доставки.

Мы создаем адаптер `ShippingAdapter`, который принимает экземпляр `ShippingCalculatorPost` или `ShippingCalculatorVip` в качестве аргумента конструктора. 
Адаптер предоставляет метод `calculate_shipping_cost`, который преобразует параметры и вызывает метод `calculate` у `ShippingCalculator`.

Мы можем использовать адаптер для расчета стоимости доставки, скрывая сложности и детали реализации класса `ShippingCalculatorPost` и `ShippingCalculatorVip`

### Адаптер ShippingAdapter

```ruby
# Адаптер
class ShippingAdapter
  def initialize(shipping_calculator)
    @shipping_calculator = shipping_calculator
  end

  def calculate_shipping_cost(weight, destination)
    # Преобразование параметров и вызов метода calculate у класса расчета доставки
    cost = @shipping_calculator.call(weight, destination)
    # Дополнительная логика адаптера, если необходимо
    # ...
    cost
  end
end

# Первый Класс, предоставляющий функциональность расчета стоимости доставки через Почту
class ShippingCalculatorPost
  def call(weight, destination)
    # Логика расчета стоимости доставки
    # ...
    rand(5..10)
  end
end

# Второй Класс, предоставляющий функциональность расчета стоимости доставки через VIP сервис
class ShippingCalculatorVip
  def call(weight, destination)
    # Логика расчета стоимости доставки
    # ...
    rand(10..20) * 2
  end
end
```

### Интерфейс доставки Shipping

```ruby
# Интерфейс доставки
class Shipping
  class << self
    def calculate_shipping_post(weight, destination)
      # Преобразование параметров, если необходимо
      call(ShippingCalculatorPost.new, weight, destination)
    end

    def calculate_shipping_vip(weight, destination)
      # Преобразование параметров, если необходимо
      call(ShippingCalculatorVip.new, weight, destination)
    end

    private

    def call(klass, weight, destination)
      # расчет доставки через Адаптер
      #
      cost = ShippingAdapter.new(klass).calculate_shipping_cost(weight, destination)
      # Дополнительная логика, если необходимо
      # ...
      cost
    end
  end
end
```

### Пример использования 

Расчет стоимости доставки через различные сервисы.

```ruby
weight = 10
destination = "some address"

cost = Shipping.calculate_shipping_post(weight, destination)
puts "POST: The shipping cost is $#{cost}"
```
В этой части кода мы вызываем метод `calculate_shipping_post` у класса `Shipping`, который в свою очередь вызывает метод `call` у экземпляра класса `ShippingCalculatorPost`. 


```ruby
cost = Shipping.calculate_shipping_vip(weight, destination)
puts "VIP: The shipping cost is $#{cost}"
```
Здесь мы вызываем метод `calculate_shipping_vip` у класса `Shipping`, который вызывает метод `call` у экземпляра класса `ShippingCalculatorVip`. 


Обратите внимание, что оба метода `calculate_shipping_post` и `calculate_shipping_vip` используют общий метод `call`, который принимает экземпляр класса расчета доставки и передает его в адаптер для расчета стоимости доставки.

Таким образом, использование адаптера для расчета стоимости доставки через различные сервисы, 
скрывая детали реализации и обеспечивая единый интерфейс для вызова расчета стоимости доставки.

### Тест Интерфейса

```ruby
require 'rspec'
require_relative 'adapter'

RSpec.describe Shipping do
  let(:weight) { 10 }
  let(:destination) { 'New York' }
  let(:cost) { 20 }

  describe '.calculate_shipping_post' do
    before do
      allow_any_instance_of(ShippingCalculatorPost).to receive(:call).with(weight, destination).and_return(cost)
    end
    it 'calculates the shipping cost via Post' do
      expect(Shipping.calculate_shipping_post(weight, destination)).to eq(cost)
    end
  end

  describe '.calculate_shipping_vip' do
    before do
      allow_any_instance_of(ShippingCalculatorVip).to receive(:call).with(weight, destination).and_return(cost)
    end

    it 'calculates the shipping cost for VIP customers' do
      expect(Shipping.calculate_shipping_vip(weight, destination)).to eq(cost)
    end
  end
end

```
