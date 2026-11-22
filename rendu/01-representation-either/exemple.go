package main

import "fmt"

type EitherKind uint8

const (
	KindRight EitherKind = iota
	KindLeft
	KindSuccess
	KindFail
)

type Either[V any] struct {
	Kind        EitherKind
	Information string
	Value       V
}

func (e Either[V]) IsRight() bool {
	return e.Kind == KindRight || e.Kind == KindSuccess
}

func (e Either[V]) IsLeft() bool {
	return e.Kind == KindLeft || e.Kind == KindFail
}

func EitherSuccessOf[V any](value V) Either[V] {
	return Either[V]{Kind: KindSuccess, Information: "success", Value: value}
}

func EitherFailOf[V any]() Either[V] {
	return Either[V]{Kind: KindFail, Information: "fail"}
}

func Add(one, two float64) Either[float64] {
	return EitherSuccessOf(one + two)
}

func main() {
	result := Add(1, 2)
	if result.IsRight() {
		fmt.Printf("Success: %v\n", result.Value)
	}
}
