---
layout: post
title:  "В чем разница private и protected методов в Ruby"
date:   2024-03-01 19:07:13 +0300
categories: ruby
toc: true
menubar_toc: true
hero_image: /images/rubu-back.jpeg
hero_darken: true
---

## В двух словах когда нужен protected в Ruby

Пример код
```ruby
class User
  attr_accessor :birthday_year

  def initialize(birthday_year)
    raise 'Invalid birth year provided. The birth year cannot be in the future' if Time.now.year < birthday_year

    @birthday_year = birthday_year
  end

  def younger_than?(x)
    self.age < x.age
  end

  protected

  def age
    Time.now.year - @birthday_year
  end
end

bob = User.new 1999
tom = User.new 2004
tom.younger_than? bob
```

Результат кода будет `true`
и прямого доступа к методу `tom.age` - нет

`NoMethodError: protected method 'age' called for #<User not initialized>`


А если использвоать видимость `private` для метода `age`, то при вызове `younger_than?` будет ошибка:

`NoMethodError: private method 'age' called for #<User not initialized>`

<img alt="Directed by Robert B. Weide" width="50%" src="/images/Directed_by_Robert B.Weide.png">