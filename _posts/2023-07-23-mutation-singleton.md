---
layout: post
title:  "Меням класс через паттерн singleton"
date:   2023-07-23 14:52:48 +0300
categories:
  - ruby
toc: true
menubar_toc: true
hero_image: /images/rubu-back.jpeg
hero_darken: true
---

<img alt="ded" src="/images/define_singleton.jpeg" width="40%"/>
# Ruby метод `define_singleton_method`

В Ruby, `define_singleton_method` - это метод, который позволяет динамически определить методы для отдельного объекта. Он позволяет добавлять методы только для этого объекта, не затрагивая другие экземпляры того же класса.

Пример использования `define_singleton_method`:

```ruby
class MyClass
  def initialize(name)
    @name = name
  end
end

obj = MyClass.new("John")

obj.define_singleton_method(:greet) do
  puts "Hello, #{@name}!"
end

obj.greet # Выводит "Hello, John!"
```

В этом примере мы используем `define_singleton_method` для динамического определения метода `greet` только для объекта `obj`. Это позволяет нам вызывать метод `greet` только для этого объекта, а не для всех экземпляров класса `MyClass`.

## Паттерн Singleton

Паттерн Singleton - это паттерн проектирования, который гарантирует, что класс имеет только один экземпляр, и предоставляет глобальную точку доступа к этому экземпляру.

Пример реализации паттерна Singleton:

```ruby
class SingletonClass
  @@instance = nil

  def self.instance
    @@instance ||= new
  end

  private_class_method :new

  def some_method
    puts "This is a singleton instance."
  end
end

obj1 = SingletonClass.instance
obj2 = SingletonClass.instance

puts obj1 == obj2 # Выводит "true"

obj1.some_method # Выводит "This is a singleton instance."
obj2.some_method # Выводит "This is a singleton instance."
```

В этом примере мы используем переменную класса `@@instance` для хранения единственного экземпляра класса `SingletonClass`. Метод `instance` возвращает этот экземпляр, создавая его, если он еще не был создан. Метод `new` объявлен как `private`, чтобы предотвратить создание экземпляров класса извне.

Таким образом, мы можем получить доступ к единственному экземпляру класса `SingletonClass` через метод `instance`, и этот экземпляр будет одинаковым для всех вызовов метода `instance`.

## Пример DatabaseConnection

Еще один пример реализации паттерна Singleton в Ruby:

```ruby
class DatabaseConnection
  attr_accessor :connection_string

  @@instance = nil

  def self.instance
    @@instance ||= new
  end

  private_class_method :new

  def connect
    puts "Connecting to database with connection string: #{@connection_string}"
    # Логика подключения к базе данных
  end
end

# Использование Singleton

# Получаем экземпляр класса DatabaseConnection
db_connection = DatabaseConnection.instance

# Устанавливаем строку подключения
db_connection.connection_string = "mysql://localhost:3306/mydatabase"

# Подключаемся к базе данных
db_connection.connect
# Выводит "Connecting to database with connection string: mysql://localhost:3306/mydatabase"

# Попытка создать новый экземпляр класса DatabaseConnection
new_db_connection = DatabaseConnection.new
# Вызывает ошибку: private method `new' called for DatabaseConnection:Class (NoMethodError)
```

В этом примере класс `DatabaseConnection` реализует паттерн Singleton. Метод `instance` возвращает единственный экземпляр класса `DatabaseConnection`. При попытке создать новый экземпляр класса с помощью оператора `new`, вызывается ошибка, так как конструктор `new` является приватным методом.

Это гарантирует, что в приложении будет существовать только один экземпляр класса `DatabaseConnection`, и все операции с базой данных будут выполняться через этот экземпляр.

## Пример с Typhoeus::Request

Есть класс
[Typhoeus::Request](https://www.rubydoc.info/github/typhoeus/typhoeus/Typhoeus/Request)
и существующий метод [cache_key](https://www.rubydoc.info/github/typhoeus/typhoeus/Typhoeus/Request#cache_key-instance_method)
поведение которого мы хотим изменить.

### Детали реализации

В этом примере мы используем метод define_singleton_method для определения лямбда-функций special_options и cache_key в контексте объекта request.
Таким образом, мы избегаем вложенных определений методов.

```ruby

class MyCache < Typhoeus::Cache::Rails
    CACHE_NAMESPACE = 'BlaBla:'
    attr_accessor :request, :response, :mutated_request

    def get(request)
      @request = request
      mutation_request!
      
      super(mutated_request)
    end

    def set(request, response)
      @request = request
      @response = response
      mutation_request!

      super(mutated_request, response)
    end

    private

    def mutation_request!
      @mutated_request = mutation_request
    end
    
    def mutation_request
        request.define_singleton_method(:special_options) do
            options.slice(:method)
        end
        
        request.define_singleton_method(:cache_key) do
            str = "#{self.class.name}#{base_url}#{hashable_string_for(special_options)}"
            "#{CACHE_NAMESPACE}#{Digest::SHA1.hexdigest(str)}"
        end

        request
    end
end
```

### Вариант 2

В этом примере мы используем лямбда-функции (->) для определения методов special_options и cache_key внутри метода mutation_request. 
Таким образом, эти методы будут иметь локальную видимость только внутри mutation_request и не будут доступны извне класса MyCache.

```ruby
def mutation_request
    special_options = -> { options.slice(:method) }
    cache_key = -> do
        str = "#{self.class.name}#{base_url}#{hashable_string_for(special_options.call)}"
        "#{CACHE_NAMESPACE}#{Digest::SHA1.hexdigest(str)}"
    end
    
    request.define_singleton_method(:special_options, special_options)
    request.define_singleton_method(:cache_key, cache_key)
    
    request
end
```

## Предупреждение RuboCop `Lint/NestedMethodDefinition`

Указывает на то, что определения методов не должны быть вложенными. Вместо этого, рекомендуется использовать лямбда-функции.

Линтер ругается `Lint/NestedMethodDefinition`
```ruby
def mutation_request
  def request.special_method
    # some code
  end
end
```

Теперь предупреждение RuboCop Lint/NestedMethodDefinition больше не будет
```ruby
def mutation_request
  request.define_singleton_method(:special_method) do
    # some code
  end
end
```
